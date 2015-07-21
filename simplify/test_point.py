from unittest import TestCase

from point import Point
from edge import Edge

__author__ = 'seanastephens'


class TestPoint(TestCase):
    def test_constructor(self):
        p = Point(1, 1)
        self.assertEquals(1, p.x())
        self.assertEquals(1, p.y())

    def test_eq_only_true_for_identity(self):
        p = Point(1, 1)
        q = Point(1, 1)
        r = Point(2, 2)
        self.assertNotEqual(p, r)
        self.assertNotEqual(r, q)
        self.assertEqual(p, p)
        self.assertEqual(q, q)

    def test_len2(self):
        p = Point(1, 1)
        q = Point(1, 2)

        self.assertAlmostEqual(1, p.len2(q), .0001)

    def test_real_degree_is_zero_at_start(self):
        p = Point(1, 1)

        self.assertEquals(0, p.real_degree())

    def test_real_degree_increases_on_adding_real_edges(self):
        p = Point(1, 1)
        p.add_edge(Edge(p, p, False))

        self.assertEquals(1, p.real_degree())

    def test_real_edge_overrides_virtual_edge(self):
        p = Point(1, 1)
        q = Point(1, 1)
        r = Point(2, 2)
        r.add_edge(Edge(p, q, True))
        r.add_edge(Edge(p, q, False))
        self.assertEquals(1, r.real_degree())
        self.assertEquals(1, len(r.edges()))

        r = Point(2, 2)
        r.add_edge(Edge(p, q, False))
        r.add_edge(Edge(p, q, True))
        self.assertEquals(1, q.real_degree())
        self.assertEquals(1, len(q.edges()))

    def test_neighbors(self):
        p = Point(0, 0)
        q = Point(1, 1)
        r = Point(2, 2)
        e = Edge(p, q, False)
        f = Edge(q, r, False)

        self.assertIn(p, q.neighbors())
        self.assertIn(r, q.neighbors())
        self.assertNotIn(q, q.neighbors())

    def test_clear_edges(self):
        p = Point(0, 0)
        q = Point(1, 1)
        r = Point(2, 2)

        e = Edge(p, q, False)
        f = Edge(p, r, False)

        self.assertEquals(2, len(p.edges()))
        p.clear_edges()
        self.assertEquals(0, len(p.edges()))
