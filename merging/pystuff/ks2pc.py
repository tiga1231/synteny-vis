import sys
import json
import readks
import itertools

def main(args):
    if len(args) < 3:
        print('Provide a lengths file')
        return 1

    xLengths = open(args[1]).read()
    yLengths = open(args[2]).read()
    xOffsets = convertLengthFileToOffsets(xLengths)
    yOffsets = convertLengthFileToOffsets(yLengths)
    
    data = readks.convertKSFileLineListToObjects(sys.stdin)
    extractPointsAndConstraints(xOffsets, yOffsets, data)
    
    return 0

def convertLengthFileToOffsets(lines):
    lengthObject = json.loads(lines)
    lengthObject = convertLengthsToNumbers(lengthObject)
    offsets = convertLengthsToCumulativeOffsets(lengthObject)
    return offsets

def convertLengthsToNumbers(lengthData):
    for chromosome in lengthData['lengths']:
        chromosome['length'] = int(chromosome['length'])
    return lengthData

def convertLengthsToCumulativeOffsets(lengths):
    lengthList = [x for x in lengths['lengths']]
    lengthList.sort(key=lambda x: int(x['length']), reverse=True)

    offsetMap = {}
    for upperbound, chromosome, in enumerate(lengthList):
        offset = sum(chromosome['length'] for chromosome in lengthList[:upperbound])
        offsetMap[chromosome['name']] =  offset
    return offsetMap

def extractPointsAndConstraints(xOffsets, yOffsets, data):
    for chromosome in data:
        points = []
        constraints = []

        xChromosomeID = chromosome['meta']['aID_c']
        xChromosomeName = ''.join(xChromosomeID.split('_')[1:])
        yChromosomeID = chromosome['meta']['bID_c']
        yChromosomeName = ''.join(yChromosomeID.split('_')[1:])

        xOffset = xOffsets[xChromosomeName]
        yOffset = yOffsets[yChromosomeName]

        for line in chromosome['data']:
            x1 = int(line['start1']) + xOffset
            y1 = int(line['start2']) + yOffset
            x2 = int(line['stop1']) + xOffset
            y2 = int(line['stop2']) + yOffset
            p1 = (x1, y1)
            p2 = (x2, y2)
            constraints.append((len(points), len(points) + 1))
            points.append(p1)
            points.append(p2)
            
        writeToFile(points, constraints, xChromosomeID, yChromosomeID)

def writeToFile(points, constraints, xChromosomeName, yChromosomeName):
    fileName = '%s.%s.pc' % (xChromosomeName, yChromosomeName)
    outfile = open(fileName, 'a')

    printPointHeader(outfile)
    printPairs(points, outfile)
    printConstraintHeader(outfile)
    printPairs(constraints, outfile)
    outfile.close()

def printPairs(pairs, outfile):
    for pair in pairs:
        print('%d,%d' % pair, file=outfile)

def printPointHeader(outfile):
    print('POINTS', file=outfile)

def printConstraintHeader(outfile):
    print('CONSTRAINTS', file=outfile)

if __name__ == '__main__':
    exit(main(sys.argv))
