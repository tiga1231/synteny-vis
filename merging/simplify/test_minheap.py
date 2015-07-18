from unittest import TestCase

from heap import MinHeap, MinHeapException, HeapAble

__author__ = 'seanastephens'


class HeapAbleInt(HeapAble):
    def __init__(self, x):
        self.x = x
        super(HeapAbleInt, self).__init__()

    def __lt__(self, other):
        return self.x < other.x

    def __eq__(self, other):
        if type(other) == int:
            return self.x == other
        return self.x == other.x


class TestMinHeap(TestCase):
    def test_empty(self):
        m = MinHeap()
        self.assertTrue(m.empty())

    def test_insert(self):
        m = MinHeap()
        m.insert(HeapAbleInt(1))
        self.assertEqual(1, m.find_min())
        self.assertEqual(1, m.size())
        self.assertFalse(m.empty())

    def test_insert_on_several(self):
        m = MinHeap()

        m.insert(HeapAbleInt(4))
        m.insert(HeapAbleInt(2))
        m.insert(HeapAbleInt(3))

        self.assertEquals(2, m.find_min())

    def test_extract_min(self):
        m = MinHeap()

        m.insert(HeapAbleInt(4))
        m.insert(HeapAbleInt(2))
        m.insert(HeapAbleInt(3))

        self.assertEquals(2, m.extract_min())
        self.assertEquals(3, m.extract_min())
        self.assertEquals(4, m.extract_min())

    def test_notify_key_change_increase(self):
        m = MinHeap()

        a = HeapAbleInt(1)
        b = HeapAbleInt(2)

        m.insert(a)
        m.insert(b)

        self.assertEquals(a, m.find_min())
        a.x = 3
        m.notify_key_change(a)
        self.assertEquals(b, m.find_min())

    def test_notify_key_change_decrease(self):
        m = MinHeap()

        a = HeapAbleInt(1)
        b = HeapAbleInt(2)

        m.insert(a)
        m.insert(b)

        self.assertEquals(a, m.find_min())
        b.x = 0
        m.notify_key_change(b)
        self.assertEquals(b, m.find_min())

    def test_notify_key_change_no_change(self):
        m = MinHeap()

        a = HeapAbleInt(1)
        b = HeapAbleInt(2)

        m.insert(a)
        m.insert(b)

        self.assertEquals(a, m.find_min())
        m.notify_key_change(a)
        self.assertEquals(a, m.find_min())
        m.notify_key_change(b)
        self.assertEquals(a, m.find_min())

    def test_notify_key_change_throws_on_no_key(self):
        m = MinHeap()

        m.insert(HeapAbleInt(1))
        m.insert(HeapAbleInt(2))

        self.assertRaises(MinHeapException, m.notify_key_change, HeapAbleInt(3))

    def test_insert_raises_on_duplicate(self):
        m = MinHeap()

        x = HeapAbleInt(1)
        m.insert(x)

        self.assertRaises(MinHeapException, m.insert, x)

    def test_find_min_raises_on_empty(self):
        m = MinHeap()

        self.assertRaises(MinHeapException, m.find_min)

    def test_extract_min_raises_on_empty(self):
        m = MinHeap()

        self.assertRaises(MinHeapException, m.extract_min)
