#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Constrained_Delaunay_triangulation_2.h>
#include <CGAL/Triangulation_conformer_2.h>
#include <CGAL/Constrained_triangulation_plus_2.h>

#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>

typedef CGAL::Exact_predicates_inexact_constructions_kernel K;
typedef CGAL::Exact_intersections_tag E;

typedef CGAL::Triangulation_vertex_base_2<K> TVB2;
typedef CGAL::Constrained_triangulation_face_base_2<K> CTFB2;
typedef CGAL::Triangulation_data_structure_2<TVB2, CTFB2> TDS2;

typedef CGAL::Constrained_Delaunay_triangulation_2<K, TDS2, E> CDTBefore;
typedef CGAL::Constrained_triangulation_plus_2<CDTBefore> CDT;
typedef CDT::Vertex_handle Vertex_handle;
typedef CDT::Point Point;

using namespace std;

Point convertToPoint(string line);
pair<unsigned int, unsigned int> convertToEdge(string line);

int main(int argc, char **argv)
{
    CDT cdt;

    string input;
    getline(cin, input);
    if(input != "POINTS") {
        cerr << "This file doesn't look right" << endl;
        return 1;
    }

    vector<Vertex_handle> points;

    getline(cin, input);
    while(!cin.eof() && input != "CONSTRAINTS") {
        Point point = convertToPoint(input);

        Vertex_handle handle = cdt.insert(point);
        points.push_back(handle);

        getline(cin, input);
    }

    getline(cin, input);
    while(!cin.eof()) {
        pair<unsigned int, unsigned int> values = convertToEdge(input);
        cdt.insert_constraint(points[values.first], points[values.second]);

        getline(cin, input);
    }

    CGAL::make_conforming_Delaunay_2(cdt);
    cout << cdt << endl;
}

Point convertToPoint(string line) {
    double a, b;

    a = atof(line.data());
    int indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    b = atof(line.data());

    return Point(a, b);
}

pair<unsigned int, unsigned int> convertToEdge(string line) {
    int a, b;

    a = atoi(line.data());
    int indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    b = atoi(line.data());

    return pair<unsigned int, unsigned int>(a, b);
}
