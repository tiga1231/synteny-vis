from unittest import TestCase
from point import Point

__author__ = 'seanastephens'


class TestPoint(TestCase):
    def test_constructor(self):
         p = Point(1, 1)
         self.assertEquals(1, p.x())
         self.assertEquals(1, p.y())

    def test_different_points_different_hashes(self):
        p = Point(1, 1)
        q = Point(1, 1)
        self.assertNotEquals(hash(q), hash(p))

    def test_eq_only_true_for_identity(self):
        p = Point(1, 1)
        q = Point(1, 1)
        self.assertNotEqual(p, q)
        self.assertNotEqual(p, q)
        self.assertEqual(p, p)
        self.assertEqual(q, q)

    def test_len2(self):
        p = Point(1,1)
        q = Point(1,2)

        self.assertAlmostEqual(1, p.len2(q), .0001)

    class EdgeStub:
        def __init__(self, b):
            self.b = b
        def virtual(self):
            return self.b

    def test_real_degree_is_zero_at_start(self):
        p = Point(1, 1)

        self.assertEquals(0, p.real_degree())

    def test_real_degree_increases_on_adding_real_edges(self):
        p = Point(1, 1)
        p.add_edge(self.EdgeStub(False))

        self.assertEquals(1, p.real_degree())