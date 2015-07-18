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


class HeapAble:
    def __init__(self):
        self.heap_index = None


class MinHeap:
    def __init__(self):
        self.__heap = []

    def empty(self):
        return len(self.__heap) == 0

    def size(self):
        return len(self.__heap)

    def insert(self, element):
        if None != element.heap_index >= 0:
            raise MinHeapException("Duplicate key " + str(element))
        self.__heap.append(element)
        element.heap_index = len(self.__heap) - 1
        self.__sift_up(len(self.__heap) - 1)

    def __swap(self, i, j):
        temp = self.__heap[i]
        self.__heap[i] = self.__heap[j]
        self.__heap[j] = temp
        self.__heap[i].heap_index = i
        self.__heap[j].heap_index = j

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
        self.__swap(0, len(self.__heap) - 1)
        self.__heap.pop()
        self.__min_heapify(0)

        ret.heap_index = None
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

    def remove_element(self, element):
        if None == element.heap_index:
            raise MinHeapException("No such key " + str(element))
        index = element.heap_index
        self.__swap(index, len(self.__heap) - 1)
        removed = self.__heap.pop()
        removed.heap_index = None

        if index < len(self.__heap):
            self.__sift_up(index)
            self.__min_heapify(index)

    def notify_key_change(self, element):
        if None == element.heap_index:
            raise MinHeapException("No such key " + str(element))
        index = element.heap_index
        self.__sift_up(index)
        self.__min_heapify(index)

    def all_elements(self):
        return self.__heap
