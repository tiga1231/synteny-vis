#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Constrained_Delaunay_triangulation_2.h>
#include <CGAL/Triangulation_conformer_2.h>
#include <CGAL/Triangulation_vertex_base_with_info_2.h>

#include <CGAL/Constrained_triangulation_2.h>
#include <CGAL/Constrained_triangulation_plus_2.h>

#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>
#include <utility>
#include <unordered_map>

#include <CGAL/Surface_mesh_simplification/edge_collapse.h>

class IndexWrapper {
    public:
        static unsigned int next_index;
        unsigned int index;
        IndexWrapper() {
            index = next_index++;
        }
};
unsigned int IndexWrapper::next_index = 0;

typedef CGAL::Exact_predicates_inexact_constructions_kernel K;
typedef CGAL::Exact_intersections_tag E;

typedef CGAL::Triangulation_vertex_base_with_info_2<IndexWrapper, K> TVB2;
typedef CGAL::Constrained_triangulation_face_base_2<K> CTFB2;
typedef CGAL::Triangulation_data_structure_2<TVB2, CTFB2> TDS2;

typedef CGAL::Constrained_Delaunay_triangulation_2<K, TDS2, E> CDTBefore;
typedef CGAL::Constrained_triangulation_plus_2<CDTBefore> CDT;
typedef CDT::Point Point;
typedef CDT::Vertex_handle Vertex_handle;

typedef CDT::All_edges_iterator EdgeIterator;
typedef CDT::All_vertices_iterator VertexIterator;
typedef CDT::Edge Edge;
typedef CDT::Vertex Vertex;

namespace SMS = CGAL::Surface_mesh_simplification;

#define DEBUG 1
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

Point convertToPoint(std::string line);
std::pair<unsigned int, unsigned int> convertToEdge(std::string line);
void printHeader(CDT cdt);
void printEdges(CDT cdt);
void printVertices(CDT cdt);
void printVertex(CDT cdt, Vertex vertex);
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


    debug("Loading points");

    int index = 0;
    std::vector<Vertex_handle> points;
    while(!std::cin.eof() && input != "CONSTRAINTS") {
        Point point = convertToPoint(input);

        Vertex_handle handle = cdt.insert(point);
        index++;
        points.push_back(handle);

        getline(std::cin, input);
    }
    debug("This many points were added to the CDT:");
    debug(index);

    index = 0;
    getline(std::cin, input);
    while(!std::cin.eof()) {
        std::pair<unsigned int, unsigned int> values = convertToEdge(input);
        cdt.insert_constraint(points[values.first], points[values.second]);

        index++;

        getline(std::cin, input);
    }

    debug("This many constraints were added to the CDT");
    debug(index);

    CGAL::make_conforming_Delaunay_2(cdt);

    std::cout << cdt << std::endl;
    //printHeader(cdt);
    //printVertices(cdt);
    //printEdges(cdt);
}

Point convertToPoint(std::string line) {
    double a, b;

    a = atof(line.data());
    int indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    b = atof(line.data());

    return Point(a, b);
}

std::pair<unsigned int, unsigned int> convertToEdge(std::string line) {
    int a, b;

    a = atoi(line.data());
    int indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    b = atoi(line.data());

    return std::pair<unsigned int, unsigned int>(a, b);
}

void printHeader(CDT cdt) {
    int number_of_vertices = 0;
    for(VertexIterator vertices = cdt.all_vertices_begin();
            vertices != cdt.all_vertices_end(); vertices++) {
        number_of_vertices++; 
    }
    std::cout << number_of_vertices << " ";

    int number_of_edges = 0;
    for(EdgeIterator edges = cdt.all_edges_begin();
            edges != cdt.all_edges_end(); edges++) {
        number_of_edges++; 
    }
    std::cout << number_of_edges << std::endl;
}

void printEdges(CDT cdt) {
    for(EdgeIterator edges = cdt.all_edges_begin(); 
            edges != cdt.all_edges_end(); edges++) {

        printEdge(cdt, *edges);
    }
}

void printEdge(CDT cdt, Edge edge) {
    bool realEdge = cdt.is_constrained(edge);

    std::string type = realEdge ? "real" : "virtual";
    int i1 = edge.first->vertex((edge.second + 1)%3)->info().index;
    int i2 = edge.first->vertex((edge.second + 2)%3)->info().index;;

    std::cout << i1 << "," << i2 << "," << type << std::endl;
}

void printVertices(CDT cdt) {
    int vertex_count = 0;
    std::map<unsigned int, Vertex> m;
    for(VertexIterator vertices = cdt.all_vertices_begin();
            vertices != cdt.all_vertices_end(); vertices++) {
        std::pair<unsigned int, Vertex> p((*vertices).info().index, *vertices);
        m.insert(p); 
        vertex_count++;
    }
    debug("Added this many vertices to the map:");
    debug(vertex_count);

    vertex_count = 0;
    for(std::map<unsigned int, Vertex>::iterator it = m.begin();
            it != m.end(); it++) {
        printVertex(cdt, it->second);
        vertex_count++;
    }
    debug("Got this many vertices back from the map:");
    debug(vertex_count);
}

void printVertex(CDT cdt, Vertex vertex) {
    Point p = vertex.point();
    std::cout << p.x() << "," << p.y() << std::endl;
}
