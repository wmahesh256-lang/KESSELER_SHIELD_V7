// math_engine.cpp
#include <pybind11/pybind11.h>
#include <cmath>
#include <vector>

namespace py = pybind11;

// 2D Gaussian Integration for Collision Probability (B-Plane)
double calculate_probability(double x_miss, double y_miss, double sigma_x, double sigma_y, double cov_xy, double hardbody_radius) {
    // Matrix singularity safeguard
    if (sigma_x <= 0.0 || sigma_y <= 0.0) return 0.0;
    
    double rho = cov_xy / (sigma_x * sigma_y);
    // Ensure positive definiteness
    if (std::abs(rho) >= 1.0) rho = 0.999 * (rho > 0 ? 1 : -1); 

    double det = sigma_x * sigma_x * sigma_y * sigma_y * (1 - rho * rho);
    if (det < 1e-12) return 0.0;

    // Numerical integration (Simpson's 2D rule approximation over circular area)
    int steps = 50;
    double dr = hardbody_radius / steps;
    double dtheta = 2.0 * M_PI / steps;
    double probability = 0.0;

    for (int i = 0; i < steps; ++i) {
        double r = (i + 0.5) * dr;
        for (int j = 0; j < steps; ++j) {
            double theta = (j + 0.5) * dtheta;
            double x = x_miss + r * std::cos(theta);
            double y = y_miss + r * std::sin(theta);
            
            double exponent = -1.0 / (2.0 * (1.0 - rho * rho)) * 
                ((x * x) / (sigma_x * sigma_x) - 
                 (2.0 * rho * x * y) / (sigma_x * sigma_y) + 
                 (y * y) / (sigma_y * sigma_y));
                 
            probability += std::exp(exponent) * r;
        }
    }
    
    probability *= (dr * dtheta) / (2.0 * M_PI * sigma_x * sigma_y * std::sqrt(1.0 - rho * rho));
    return probability;
}

PYBIND11_MODULE(math_engine, m) {
    m.doc() = "Kessler Shield C++ Physics Engine optimized for ARM64";
    m.def("calculate_pc", &calculate_probability, 
          "Calculate B-Plane Collision Probability",
          py::arg("x_miss"), py::arg("y_miss"), 
          py::arg("sigma_x"), py::arg("sigma_y"), 
          py::arg("cov_xy"), py::arg("hbr"));
}