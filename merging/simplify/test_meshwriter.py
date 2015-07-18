from unittest import TestCase

from meshwriter import write_mesh_to_stream_as_points_and_edges
from point import Point
from edge import Edge

original_points = [
    Point(0, 0),
    Point(0, 1),
    Point(1, 1),
    Point(1, 0)
]
edges = [
    Edge(original_points[0], original_points[1], False),
    Edge(original_points[1], original_points[2], False),
    Edge(original_points[2], original_points[3], False),
    Edge(original_points[3], original_points[0], False),
    Edge(original_points[1], original_points[3], True)
]


class TestMeshWriter(TestCase):
    class WriteStub:
        def __init__(self):
            self.content = ''

        def write(self, s):
            self.content += s

    def test_write_mesh_to_stream(self):
        w = self.WriteStub()
        write_mesh_to_stream_as_points_and_edges(edges, output=w)
        header = w.content.split('\n')[0]
        self.assertEquals('4 5', header)

    def test_write_mesh_to_stream2(self):
        w = self.WriteStub()
        write_mesh_to_stream_as_points_and_edges(edges, output=w)
        points = w.content.split('\n')[1:5]
        points.sort()
        self.assertRegex(points[0], '0.0*,0.0*')
        self.assertRegex(points[1], '0.0*,1.0*')
        self.assertRegex(points[2], '1.0*,0.0*')
        self.assertRegex(points[3], '1.0*,1.0*')

    def test_write_mesh_to_stream3(self):
        w = self.WriteStub()
        write_mesh_to_stream_as_points_and_edges(edges, output=w)
        edge_list = w.content.split('\n')[5:10]
        # not sure a good way to test this; the order of the edges
        # is determined by set() implementation
        self.assertEquals(5, len(edge_list))

    def test_write_mesh_to_stream4(self):
        w = self.WriteStub()
        write_mesh_to_stream_as_points_and_edges(edges, output=w)
        self.assertEquals(w.content[-1], '\n')
