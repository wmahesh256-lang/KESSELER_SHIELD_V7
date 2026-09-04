package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

const dbName = "kessler.db"

var urls = []string{
	"https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
	"https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle",
}

func initDB() *sql.DB {
	db, err := sql.Open("sqlite3", dbName)
	if err != nil {
		log.Fatal(err)
	}
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS satellites (
		name TEXT PRIMARY KEY,
		tle1 TEXT,
		tle2 TEXT,
		last_updated DATETIME
	);`
	_, err = db.Exec(createTableQuery)
	if err != nil {
		log.Fatal(err)
	}
	return db
}

func fetchAndStoreTLE(url string, db *sql.DB, wg *sync.WaitGroup) {
	defer wg.Done()
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Error fetching %s: %v", url, err)
		return
	}
	defer resp.Body.Close()

	tx, _ := db.Begin()
	stmt, _ := tx.Prepare(`INSERT INTO satellites (name, tle1, tle2, last_updated) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET tle1=excluded.tle1, tle2=excluded.tle2, last_updated=excluded.last_updated`)
	defer stmt.Close()

	scanner := bufio.NewScanner(resp.Body)
	var name, tle1, tle2 string
	lineNum := 0

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		switch lineNum % 3 {
		case 0:
			name = line
		case 1:
			tle1 = line
		case 2:
			tle2 = line
			stmt.Exec(name, tle1, tle2, time.Now())
		}
		lineNum++
	}
	tx.Commit()
	fmt.Printf("Successfully processed: %s\n", url)
}

func main() {
	db := initDB()
	defer db.Close()
	var wg sync.WaitGroup

	for _, url := range urls {
		wg.Add(1)
		go fetchAndStoreTLE(url, db, &wg)
	}
	wg.Wait()
	fmt.Println("Telemetry pipeline execution complete.")
}
