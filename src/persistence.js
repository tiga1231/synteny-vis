const simplify = (dirtyPoints, persistence) => {
  const points = removeNonExtrema(dirtyPoints);
  const index = indexOfSmallestDifference(points);

  if (points.length < 3 || gapBetweenPoints(points, index) > persistence)
    return points;

  const toRemove = index === 0 ? 1 : index;
  points.splice(toRemove, 1);

  return simplify(points, persistence);
};
exports.simplify = simplify;

const removeNonExtrema = A => {
  return A.filter((element, index) => {
    if (index === 0 || index === A.length - 1)
      return true;

    const before = A[index - 1].y;
    const here = element.y;
    const after = A[index + 1].y;
    return here > Math.max(before, after) || here < Math.min(before, after);
  });
};

const gapBetweenPoints = (A, i) => Math.abs(A[i].y - A[i + 1].y);

const indexOfSmallestDifference = A => {
  const wrapped = A.map((value, index) => ({
    value: (index < A.length - 1) ? gapBetweenPoints(A, index) : Infinity,
    index
  }));
  wrapped.sort((a, b) => a.value - b.value);
  return wrapped[0].index;
};
