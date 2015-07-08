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

def leftchild(i):
    """Return index of left child of i in a 0-based heap"""
    return 2 * (i + 1) - 1
def rightchild(i):
    """Return index of right child of i in a 0-based heap"""
    return 2 * (i + 1) - 1 + 1

def parent(i):
    """Return index of parent of i in a 0-based heap"""
    return (i + 1) // 2 - 1

def swapHandles(A, i, j):
    temp = A[i]
    A[i] = A[j]
    A[j] = temp
    A[i].index = i
    A[j].index = j

class minheap:

    def __init__(self):
        self.A = []

    def empty(self):
        return len(self.A) == 0
    def size(self):
        return len(self.A)

    def insert(self, element, key):
        handle = KV(key, element, len(self.A))
        self.A.append(handle)
        self._decreaseKey(handle.index, key)
        return handle

    def _decreaseKey(self, index, newKey):

        self.A[index].key = newKey
        while parent(index) >= 0 and self.A[parent(index)].key > self.A[index].key:
            swapHandles(self.A, index, parent(index))
            index = parent(index)

    def findMin(self):
        if self.empty():
            raise Exception('Heap underflow')
        return self.A[0].value

    def extractMin(self):
        if self.empty():
            raise Exception('Heap underflow')
        ret = self.A[0];
        swapHandles(self.A, 0, -1)
        self.A.pop()
        self._minHeapify(0)
        ret.invalidate()
        return ret.value

    def _minHeapify(self, index):
        left = leftchild(index)
        right = rightchild(index)
        A = self.A
        if left < len(A) and A[left].key < A[index].key:
            smallest = left
        else:
            smallest = index
        if right < len(A) and A[right].key < A[smallest].key:
            smallest = right
        if smallest != index:
            swapHandles(A, smallest, index)
            self._minHeapify(smallest)

    def changeKey(self, handle, key):
        if not handle.valid:
            raise Exception('Stale handle')
        if handle.key < key:
            handle.key = key
            self._minHeapify(handle.index)
        else:
            self._decreaseKey(handle.index, key)

    def removeElement(self, handle):
      if not handle.valid:
            raise Exception('Stale handle')
      index = handle.index
      swapHandles(self.A, index, len(self.A)-1)
      removed = self.A.pop()
      removed.invalidate()
      self._minHeapify(index)


def testInternalIndicesMaintained(A):
    return all(x.index == i for i, x in enumerate(A))
        
def pointerTests():
    assert leftchild(0) == 1
    assert leftchild(1) == 3
    assert rightchild(0) == 2

def tests():
    import pprint
    p = pprint.PrettyPrinter()

    h = minheap()
    a = { 'name': 'a' }
    aHandle = h.insert(a, 1)
    assert a == h.findMin()
    assert aHandle.value == a
    assert testInternalIndicesMaintained(h.A)
    #p.pprint(h.A)
    
    b = { 'name': 'b' }
    bHandle = h.insert(b, 0)
    assert b == h.findMin()
    assert bHandle.value == b
    assert testInternalIndicesMaintained(h.A)
    #p.pprint(h.A)

    assert b == h.extractMin()
    assert a == h.findMin()
    assert testInternalIndicesMaintained(h.A)
    
    bHandle = h.insert(b, 0)
    assert b == h.findMin()
    assert testInternalIndicesMaintained(h.A)
    h.changeKey(bHandle, 2)
    assert a == h.findMin()
    assert testInternalIndicesMaintained(h.A)
    
    h = minheap()
    a = { 'name': 'a'}
    b = { 'name': 'b'}
    c = { 'name': 'c'}
    aH = h.insert(a, 0)
    bH = h.insert(b, 1)
    cH = h.insert(c, 2)
    assert a == h.extractMin()
    assert testInternalIndicesMaintained(h.A)
    
    h = minheap()
    data = [{'name': i} for i in range(10)]
    for el in data:
        h.insert(el, el['name'])
        assert testInternalIndicesMaintained(h.A)

    last = -1
    while len(h.A) > 0:
        x = h.extractMin()
        assert x['name'] > last, str(x['name']) + ':' + str(last)
        last = x['name']
        assert testInternalIndicesMaintained(h.A)

    h = minheap()
    data = [{'name': i} for i in range(10, -1)]
    for el in data:
        h.insert(el, el['name'])
        assert testInternalIndicesMaintained(h.A)

    last = -1
    while len(h.A) > 0:
        x = h.extractMin()
        assert x['name'] > last, str(x['name']) + ':' + str(last)
        last = x['name']
        assert testInternalIndicesMaintained(h.A)

def removeTests():
    h = minheap()
    h.insert(6, 6)
    h.insert(5, 5)
    handle = h.insert(4, 4)
    h.insert(3, 3)
    h.removeElement(handle)
    testInternalIndicesMaintained(h.A)
    assert h.extractMin() == 3
    assert h.extractMin() == 5
    assert h.extractMin() == 6

def allTests():
    pointerTests()
    tests()
    removeTests()
allTests()
