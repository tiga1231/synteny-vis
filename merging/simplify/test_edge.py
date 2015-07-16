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

        self.assertTrue(p in e.points())
        self.assertTrue(q in e.points())

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
        self.assertEquals(e, g)
        self.assertEquals(e, h)
        self.assertEquals(f, g)
        self.assertEquals(f, h)
        self.assertEquals(g, h)
        self.assertEquals(f, e)
        self.assertEquals(g, e)
        self.assertEquals(h, e)
        self.assertEquals(g, f)
        self.assertEquals(h, f)
        self.assertEquals(h, g)

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

        self.assertTrue(e.canBeCollapsed())
        self.assertTrue(f.canBeCollapsed())
        self.assertTrue(g.canBeCollapsed())

    def test_single_real_edge_will_not_collapse(self):
        p = Point(1, 1)
        q = Point(2, 2)

        e = Edge(p, q, False)

        self.assertFalse(e.canBeCollapsed())

    def test_single_real_edge_will_collapse(self):
        p = Point(1, 1)
        q = Point(2, 2)

        e = Edge(p, q, True)

        self.assertTrue(e.canBeCollapsed())

    def test_virtual_edge_that_would_violate_topo_will_not_collapse(self):
        p1 = Point(1, 1)
        p2 = Point(1, 3)
        p3 = Point(1, 2)
        q1 = Point(2, 1)
        q2 = Point(2, 2)
        q3 = Point(2, 3)

        pe1 = Edge(p1, p2, False)
        pe2 = Edge(p2, p3, False)
        qe1 = Edge(q1, q2, False)
        qe2 = Edge(q2, q3, False)
        ve = Edge(p2, q2, True)

        self.assertFalse(ve.canBeCollapsed())

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