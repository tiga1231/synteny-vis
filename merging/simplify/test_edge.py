from unittest import TestCase

from point import Point
from edge import Edge

__author__ = 'seanastephens'


class TestEdge(TestCase):
    def test_constructor_sets_virtual(self):
        p = Point(0, 0)
        q = Point(0, 0)
        e = Edge(p, q, False)
        f = Edge(p, q, True)

        self.assertFalse(e.virtual())
        self.assertTrue(f.virtual())

    def test_constructor_sets_points(self):
        p = Point(0, 0)
        q = Point(0, 0)
        e = Edge(p, q, False)

        pts = [e.p1(), e.p2()]
        self.assertTrue(p in pts)
        self.assertTrue(q in pts)

    def test_len2(self):
        p = Point(0, 0)
        q = Point(1, 0)
        e = Edge(p, q, True)

        self.assertAlmostEqual(1, e.len2(), .00001)

    def test_eq_on_equal(self):
        p = Point(1, 1)
        q = Point(2, 2)

        e = Edge(p, q, True)
        f = Edge(q, p, True)
        g = Edge(p, q, False)
        h = Edge(q, p, False)

        self.assertEquals(e, f)
        self.assertEquals(f, e)

        self.assertEquals(g, h)
        self.assertEquals(h, g)

        self.assertNotEquals(e, g)
        self.assertNotEquals(e, h)
        self.assertNotEquals(f, g)
        self.assertNotEquals(f, h)
        self.assertNotEquals(g, e)
        self.assertNotEquals(h, e)
        self.assertNotEquals(g, f)
        self.assertNotEquals(h, f)

    def test_eq_on_almost_equal(self):
        p = Point(1, 1)
        q = Point(1, 2)
        e = Edge(p, p, False)
        f = Edge(p, q, False)
        self.assertNotEquals(e, f)
        self.assertNotEquals(f, e)

    def test_eq_on_unequal(self):
        p = Point(1, 1)
        q = Point(2, 2)
        r = Point(3, 3)

        e = Edge(p, q, True)
        f = Edge(q, r, True)
        g = Edge(p, q, False)
        h = Edge(q, r, False)

        self.assertNotEquals(e, f)
        self.assertNotEquals(f, e)
        self.assertNotEquals(g, h)
        self.assertNotEquals(h, g)
        self.assertNotEquals(e, h)
        self.assertNotEquals(h, e)
        self.assertNotEquals(f, g)
        self.assertNotEquals(g, f)

    def test_equal_points_equal_hashes(self):
        p = Point(1, 1)
        q = Point(2, 2)

        e = Edge(p, q, True)
        f = Edge(q, p, True)
        g = Edge(p, q, False)
        h = Edge(q, p, False)

        self.assertEquals(hash(e), hash(f))
        self.assertEquals(hash(e), hash(g))
        self.assertEquals(hash(e), hash(h))
        self.assertEquals(hash(f), hash(g))
        self.assertEquals(hash(f), hash(h))
        self.assertEquals(hash(g), hash(h))
        self.assertEquals(hash(f), hash(e))
        self.assertEquals(hash(g), hash(e))
        self.assertEquals(hash(h), hash(e))
        self.assertEquals(hash(g), hash(f))
        self.assertEquals(hash(h), hash(f))
        self.assertEquals(hash(h), hash(g))

    def test_inner_and_end_segments_of_real_line_can_be_merged(self):
        p = Point(1, 1)
        q = Point(2, 2)
        r = Point(3, 3)
        s = Point(4, 4)

        e = Edge(p, q, False)
        f = Edge(q, r, False)
        g = Edge(r, s, False)

        self.assertTrue(e.can_be_collapsed())
        self.assertTrue(f.can_be_collapsed())
        self.assertTrue(g.can_be_collapsed())

    def test_single_real_edge_will_not_collapse(self):
        p = Point(1, 1)
        q = Point(2, 2)

        e = Edge(p, q, False)

        self.assertFalse(e.can_be_collapsed())

    def test_single_real_edge_will_collapse(self):
        p = Point(1, 1)
        q = Point(2, 2)

        e = Edge(p, q, True)

        self.assertTrue(e.can_be_collapsed())

    def test_virtual_edge_that_would_violate_topology_will_not_collapse(self):
        p1 = Point(1, 1)
        p2 = Point(1, 3)
        p3 = Point(1, 2)
        q1 = Point(2, 1)
        q2 = Point(2, 2)
        q3 = Point(2, 3)

        Edge(p1, p2, False)
        Edge(p2, p3, False)
        Edge(q1, q2, False)
        Edge(q2, q3, False)
        ve = Edge(p2, q2, True)

        self.assertFalse(ve.can_be_collapsed())

    def test_lt_on_real_v_virtual(self):
        p = Point(1, 1)
        q = Point(2, 2)
        r = Point(3, 3)

        e = Edge(p, q, False)
        f = Edge(q, r, True)
        self.assertLess(f, e)

    def test_lt_on_virtual_virtual(self):
        p = Point(1, 1)
        q = Point(2, 2)
        r = Point(4, 4)

        e = Edge(p, q, True)
        f = Edge(q, r, True)
        self.assertLess(e, f)

    def test_lt_on_real_real(self):
        p = Point(1, 1)
        q = Point(2, 2)
        r = Point(4, 4)

        e = Edge(p, q, False)
        f = Edge(q, r, False)
        self.assertLess(e, f)

    def test_replace_point(self):
        p = Point(1, 1)
        q = Point(2, 2)
        r = Point(4, 4)

        e = Edge(p, q, False)
        f = Edge(q, r, False)
        f.replace_point(q, p)
        fpts = [f.p1(), f.p2()]
        self.assertIn(p, fpts)
        self.assertIn(r, fpts)
        self.assertNotIn(q, fpts)

        e.replace_point(q, r)
        epts = [e.p1(), e.p2()]
        self.assertIn(p, epts)
        self.assertIn(r, epts)
        self.assertNotIn(q, epts)

    def test_collapse_edge_pure_virtual(self):
        W = Point(0, 0)
        E = Point(2, 0)
        N = Point(1, 1)
        S = Point(1, -1)

        nw = Edge(N, W, False)
        ne = Edge(N, E, False)
        sw = Edge(S, W, False)
        se = Edge(S, E, False)
        collapse = Edge(N, S, False)
        nw.heap_index = ne.heap_index = se.heap_index = sw.heap_index = 1

        new_point, removed_edges = collapse.collapse()
        self.assertEquals(3, len(removed_edges))
        self.assertEquals(0, len(N.edges()))
        self.assertEquals(0, len(S.edges()))
        self.assertEquals(1, len(W.edges()))
        self.assertEquals(1, len(E.edges()))
        self.assertEquals(2, len(new_point.edges()))

        for x in removed_edges:
            x.heap_index = None
        self.assertIsNotNone(W.edges()[0].heap_index)
        self.assertIsNotNone(E.edges()[0].heap_index)

