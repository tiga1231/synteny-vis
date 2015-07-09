from unittest import TestCase
from heap import MinHeap, MinHeapException

__author__ = 'seanastephens'


class TestMinHeap(TestCase):
    def test_empty(self):
        m = MinHeap()
        self.assertTrue(m.empty())

    def test_insert(self):
        m = MinHeap()
        m.insert(1)
        self.assertEqual(1, m.find_min())
        self.assertEqual(1, m.size())
        self.assertFalse(m.empty())

    def test_insert_on_several(self):
        m = MinHeap()

        m.insert(4)
        m.insert(2)
        m.insert(3)

        self.assertEquals(2, m.find_min())

    def test_extract_min(self):
        m = MinHeap()

        m.insert(4)
        m.insert(2)
        m.insert(3)

        self.assertEquals(2, m.extract_min())
        self.assertEquals(3, m.extract_min())
        self.assertEquals(4, m.extract_min())

    class OrderAble:
        def __init__(self, i):
            self.i = i

        def __lt__(self, other):
            return self.i < other.i

    def test_notify_key_change_increase(self):
        m = MinHeap()

        a = self.OrderAble(1)
        b = self.OrderAble(2)

        m.insert(a)
        m.insert(b)

        self.assertEquals(a, m.find_min())
        a.i = 3
        m.notify_key_change(a)
        self.assertEquals(b, m.find_min())

    def test_notify_key_change_decrease(self):
        m = MinHeap()

        a = self.OrderAble(1)
        b = self.OrderAble(2)

        m.insert(a)
        m.insert(b)

        self.assertEquals(a, m.find_min())
        b.i = 0
        m.notify_key_change(b)
        self.assertEquals(b, m.find_min())

    def test_notify_key_change_no_change(self):
        m = MinHeap()

        a = self.OrderAble(1)
        b = self.OrderAble(2)

        m.insert(a)
        m.insert(b)

        self.assertEquals(a, m.find_min())
        m.notify_key_change(a)
        self.assertEquals(a, m.find_min())
        m.notify_key_change(b)
        self.assertEquals(a, m.find_min())

    def test_remove_element(self):
        m = MinHeap()

        m.insert(1)
        m.insert(2)

        self.assertEquals(1, m.find_min())
        m.remove_element(1)
        self.assertEquals(2, m.find_min())

    def test_notify_key_change_throws_on_no_key(self):
        m = MinHeap()

        m.insert(1)
        m.insert(2)

        self.assertRaises(MinHeapException, m.notify_key_change, 3)

    def test_notify_key_change_throws_on_no_key_after_key_was_in_heap(self):
        m = MinHeap()

        m.insert(1)
        m.insert(2)
        m.insert(3)
        m.remove_element(1)

        self.assertRaises(MinHeapException, m.notify_key_change, 1)

    def test_insert_throws_on_no_key(self):
        m = MinHeap()
        m.insert(1)

        self.assertRaises(MinHeapException, m.insert, 1)

    def test_insert_raises_on_duplicate(self):
        m = MinHeap()

        m.insert(1)

        self.assertRaises(MinHeapException, m.insert, 1)

    def test_find_min_raises_on_empty(self):
        m = MinHeap()

        self.assertRaises(MinHeapException, m.find_min)

    def test_extract_min_raises_on_empty(self):
        m = MinHeap()

        self.assertRaises(MinHeapException, m.extract_min)