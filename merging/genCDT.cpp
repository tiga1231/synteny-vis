#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Exact_predicates_exact_constructions_kernel_with_sqrt.h>
#include <CGAL/Constrained_Delaunay_triangulation_2.h>
#include <CGAL/Triangulation_conformer_2.h>
#include <CGAL/Constrained_triangulation_plus_2.h>

#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>

typedef CGAL::Exact_predicates_exact_constructions_kernel_with_sqrt K;
typedef CGAL::Exact_intersections_tag E;

typedef CGAL::Triangulation_vertex_base_2<K> TVB2;
typedef CGAL::Constrained_triangulation_face_base_2<K> CTFB2;
typedef CGAL::Triangulation_data_structure_2<TVB2, CTFB2> TDS2;

typedef CGAL::Constrained_Delaunay_triangulation_2<K, TDS2, E> CDTBefore;
typedef CGAL::Constrained_triangulation_plus_2<CDTBefore> CDT;
typedef CDT::Vertex_handle Vertex_handle;
typedef CDT::Point Point;

using namespace std;

pair<Point, Point> convertToPointPair(string line);

int main(int argc, char **argv)
{
    CDT cdt;
    string input;

    getline(cin, input);
    while(!cin.eof()) {
        cdt.push_back(convertToPointPair(input));
        getline(cin, input);
    }

    //cerr << "All constraints inserted." << endl;

    CGAL::Triangulation_conformer_2<CDT> conf(cdt);
    while(conf.step_by_step_conforming_Delaunay()) {
        cerr << "working..." << endl; 
    }

    cout.precision(15);
    cout << cdt << endl;
}

pair<Point, Point> convertToPointPair(string line) {
    double x1, x2, y1, y2;

    x1 = atof(line.data());

    int indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    x2 = atof(line.data());

    indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    y1 = atof(line.data());

    indexOfNextComma = line.find(',');
    line = line.substr(indexOfNextComma + 1);
    y2 = atof(line.data());

    cerr.precision(15);
    return pair<Point, Point>(Point(x1, y1), Point(x2, y2));
}
