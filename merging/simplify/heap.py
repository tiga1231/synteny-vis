def left_child(i):
    """Return index of left child of i in a 0-based heap"""
    return 2 * (i + 1) - 1


def right_child(i):
    """Return index of right child of i in a 0-based heap"""
    return 2 * (i + 1) - 1 + 1


def parent(i):
    """Return index of parent of i in a 0-based heap"""
    return (i + 1) // 2 - 1


class MinHeapException(Exception):
    pass


class MinHeap:
    def __init__(self):
        self.__heap = []
        self.__index_map = {}

    def empty(self):
        return len(self.__heap) == 0

    def size(self):
        return len(self.__heap)

    def insert(self, element):
        if element in self.__index_map.keys():
            raise MinHeapException("Duplicate key added to heap")
        self.__heap.append(element)
        self.__index_map[element] = len(self.__heap) - 1
        self.__sift_up(len(self.__heap) - 1)

    def __swap(self, i, j):
        temp = self.__heap[i]
        self.__heap[i] = self.__heap[j]
        self.__heap[j] = temp
        self.__index_map[self.__heap[i]] = i
        self.__index_map[self.__heap[j]] = j

    def __get_index(self, element):
        if element not in self.__index_map.keys():
            raise MinHeapException('Element not in heap')
        return self.__index_map[element]

    def __remove_index(self, element):
        del self.__index_map[element]

    def __sift_up(self, index):
        while parent(index) >= 0 and self.__heap[parent(index)] > self.__heap[index]:
            self.__swap(index, parent(index))
            index = parent(index)

    def find_min(self):
        if self.empty():
            raise MinHeapException('Heap underflow')
        return self.__heap[0]

    def extract_min(self):
        if self.empty():
            raise MinHeapException('Heap underflow')
        ret = self.__heap[0]
        self.__swap(0, -1)
        self.__heap.pop()
        self.__min_heapify(0)
        self.__remove_index(ret)
        return ret

    def __min_heapify(self, index):
        left = left_child(index)
        right = right_child(index)
        heap = self.__heap
        if left < len(heap) and heap[left] < heap[index]:
            smallest = left
        else:
            smallest = index
        if right < len(heap) and heap[right] < heap[smallest]:
            smallest = right
        if smallest != index:
            self.__swap(smallest, index)
            self.__min_heapify(smallest)

    def notify_key_change(self, element):
        index = self.__get_index(element)
        self.__sift_up(index)
        self.__min_heapify(index)

    def remove_element(self, element):
        index = self.__get_index(element)
        self.__swap(index, len(self.__heap) - 1)
        self.__remove_index(element)
        self.__heap.pop()
        self.__min_heapify(index)
