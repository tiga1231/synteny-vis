#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Constrained_Delaunay_triangulation_2.h>
#include <CGAL/Triangulation_conformer_2.h>

#include <CGAL/Constrained_triangulation_2.h>
#include <CGAL/Constrained_triangulation_plus_2.h>

#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>
#include <utility>
#include <unordered_map>

#include <CGAL/Surface_mesh_simplification/edge_collapse.h>

typedef CGAL::Exact_predicates_inexact_constructions_kernel K;
typedef CGAL::Exact_intersections_tag E;

typedef CGAL::Triangulation_vertex_base_2<K> TVB2;
typedef CGAL::Constrained_triangulation_face_base_2<K> CTFB2;
typedef CGAL::Triangulation_data_structure_2<TVB2, CTFB2> TDS2;

typedef CGAL::Constrained_Delaunay_triangulation_2<K, TDS2, E> CDTBefore;
typedef CGAL::Constrained_triangulation_plus_2<CDTBefore> CDT;
typedef CDT::Point Point;
typedef CDT::Vertex_handle Vertex_handle;

typedef CDT::Finite_edges_iterator EdgeIterator;
typedef CDT::Edge Edge;

namespace SMS = CGAL::Surface_mesh_simplification;

#define DEBUG 0
void debug(std::string message) {
    if(DEBUG) {
        std::cerr << message << std::endl;
    }
}

void debug(int val) {
    if(DEBUG) {
        std::cerr << val << std::endl;
    }
}

std::vector<double> splitLineIntoPoints(std::string line);
std::vector<int> splitLineIntoConstraint(std::string line);
void printEdges(CDT cdt);
void printHeader();
void printEdge(CDT cdt, Edge edge);


int main(int argc, char **argv)
{
    CDT cdt;

    std::string input;
    getline(std::cin, input);
    if(input != "POINTS") {
        std::cerr << "This file doesn't look right" << std::endl;
        return 1;
    }
    getline(std::cin, input);

    int index = 0;
    std::unordered_map<int, Vertex_handle> points;

    bool pointMode = true;

    debug("Loading points");

    while(!std::cin.eof() && input != "CONSTRAINTS") {
        std::vector<double> values = splitLineIntoPoints(input);

        Vertex_handle point = cdt.insert(Point(values[0], values[1]));

        std::pair<int, Vertex_handle> newPoint(index++, point);

        points.insert(newPoint);

        debug("Loaded point number");
        debug(index);

        getline(std::cin, input);
    }
    debug("Points loaded");

    index = 0;
    getline(std::cin, input);
    while(!std::cin.eof()) {
        std::vector<int> values = splitLineIntoConstraint(input);
        cdt.insert_constraint(points[values[0]], points[values[1]]);

        debug("Loaded constraint number");
        debug(index++);

        getline(std::cin, input);
    }

    debug("All set up");

    CGAL::make_conforming_Delaunay_2(cdt);

    printEdges(cdt);
}

std::vector<double> splitLineIntoPoints(std::string line) {
    std::vector<double> values;
    int indexOfNextComma = 0;

    while(indexOfNextComma > -1) {
        values.push_back(atof(line.data()));
        indexOfNextComma = line.find(',');
        line = line.substr(indexOfNextComma + 1);
    }

    return values;
}

std::vector<int> splitLineIntoConstraint(std::string line) {
    std::vector<int> values;
    int indexOfNextComma = 0;

    while(indexOfNextComma > -1) {
        values.push_back(atoi(line.data()));
        indexOfNextComma = line.find(',');
        line = line.substr(indexOfNextComma + 1);
    }

    return values;
}

void printEdges(CDT cdt) {
    printHeader();
    for(EdgeIterator edges = cdt.finite_edges_begin(); 
            edges != cdt.finite_edges_end(); edges++) {

        printEdge(cdt, *edges);
    }
}

void printHeader() {
    std::cout << "x1,y1,x2,y2,type" << std::endl;
}

void printEdge(CDT cdt, Edge edge) {
    bool realEdge = cdt.is_constrained(edge);

    CDT::Segment segment = cdt.segment(edge);
    Point p1 = segment.source();
    Point p2 = segment.target();

    std::string type = realEdge ? "real" : "virtual";

    std::cout << p1.x() << "," << p1.y() << "," 
        << p2.x() << "," << p2.y() << "," 
        << type << std::endl;
}

