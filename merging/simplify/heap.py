class KV:
    def __init__(self, k, v, i):
        self.key = k
        self.value = v
        self.index = i
        self.valid = True

    def __repr__(self):
        return '(' + repr(self.key) + ':' + repr(self.value) + \
               ',index:' + repr(self.index) + ')'

    def invalidate(self):
        self.valid = False


def left_child(i):
    """Return index of left child of i in a 0-based heap"""
    return 2 * (i + 1) - 1


def right_child(i):
    """Return index of right child of i in a 0-based heap"""
    return 2 * (i + 1) - 1 + 1


def parent(i):
    """Return index of parent of i in a 0-based heap"""
    return (i + 1) // 2 - 1


def swap_handles(array, i, j):
    temp = array[i]
    array[i] = array[j]
    array[j] = temp
    array[i].index = i
    array[j].index = j


class MinHeap:
    def __init__(self):
        self.heap = []

    def empty(self):
        return len(self.heap) == 0

    def size(self):
        return len(self.heap)

    def insert(self, element, key):
        handle = KV(key, element, len(self.heap))
        self.heap.append(handle)
        self.__decrease_key(handle.index, key)
        return handle

    def __decrease_key(self, index, new_key):

        self.heap[index].key = new_key
        while parent(index) >= 0 and self.heap[parent(index)].key > self.heap[index].key:
            swap_handles(self.heap, index, parent(index))
            index = parent(index)

    def find_min(self):
        if self.empty():
            raise Exception('Heap underflow')
        return self.heap[0].value

    def extract_min(self):
        if self.empty():
            raise Exception('Heap underflow')
        ret = self.heap[0]
        swap_handles(self.heap, 0, -1)
        self.heap.pop()
        self.__min_heapify(0)
        ret.invalidate()
        return ret.value

    def __min_heapify(self, index):
        left = left_child(index)
        right = right_child(index)
        heap = self.heap
        if left < len(heap) and heap[left].key < heap[index].key:
            smallest = left
        else:
            smallest = index
        if right < len(heap) and heap[right].key < heap[smallest].key:
            smallest = right
        if smallest != index:
            swap_handles(heap, smallest, index)
            self.__min_heapify(smallest)

    def change_key(self, handle, key):
        if not handle.valid:
            raise Exception('Stale handle')
        if handle.key < key:
            handle.key = key
            self.__min_heapify(handle.index)
        else:
            self.__decrease_key(handle.index, key)

    def remove_element(self, handle):
        if not handle.valid:
            raise Exception('Stale handle')
        index = handle.index
        swap_handles(self.heap, index, len(self.heap) - 1)
        removed = self.heap.pop()
        removed.invalidate()
        self.__min_heapify(index)
