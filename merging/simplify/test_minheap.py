from unittest import TestCase
from heap import MinHeap

__author__ = 'seanastephens'


class TestMinHeap(TestCase):
    def test_empty(self):
        m = MinHeap()
        self.assertTrue(m.empty())

    def test_insert(self):
        m = MinHeap()
        m.insert(1, 1)
        self.assertEqual(1, m.find_min())

    def test_insert_on_several(self):
        m = MinHeap()

        m.insert(4, 4)
        m.insert(2, 2)
        m.insert(3, 3)

        self.assertEquals(2, m.find_min())

    # def test__decreaseKey(self):
    #     m = MinHeap()
    #     self.fail()

    def test_extract_min(self):
        m = MinHeap()

        m.insert(4, 4)
        m.insert(2, 2)
        m.insert(3, 3)

        self.assertEquals(2, m.extract_min())
        self.assertEquals(3, m.extract_min())
        self.assertEquals(4, m.extract_min())

    # def test_changeKey(self):
    #     self.fail()
    #
    # def test_removeElement(self):
    #     self.fail()
