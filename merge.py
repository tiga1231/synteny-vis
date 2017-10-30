# python merge.py 6,10 4p True

from glob import glob
import os
import json
from natsort import natsorted
import sys

def getOffset(gid):
    gid = str(gid)

    with open('build/lengths0/'+gid) as f:
        chrs = json.load(f)['chromosomes']
        chrs = [  (c['name'],c['length']) for c in chrs   ]
        chrs = natsorted(chrs)
    chrNames = [i[0] for i in chrs]
    maxLocations = [i[1] for i in chrs]
    res = {chrName: sum(maxLocations[:chrNames.index(chrName)]) for chrName in chrNames}
    res[''] = sum(maxLocations)
    return res


def isComment(line):
    #res = line.startswith(('#', 'NA', 'undef'))
    if line is None:
        return True
    res = line.startswith('#')
    return res


def applyOffset(line, offsets1, offsets2):
    line = line.split('\t')
    for i in [3, 7]:
        seg = line[i].split('||')
        chrName = seg[0]
        if i==3:
            start = int(seg[1])+offsets1[chrName]
            stop = int(seg[2])+offsets1[chrName]
        elif i==7:
            start = int(seg[1])+offsets2[chrName]
            stop = int(seg[2])+offsets2[chrName]
        start, stop = str(start), str(stop)
            
        seg[1], seg[2] = start, stop
        line[i] = '||'.join(seg)
        if i==3:
            line[4], line[5] = stop, start
        elif i==7:
            line[8], line[9] = stop, start
    res = '\t'.join(line)
    line[2:6], line[6:10] = line[6:10], line[2:6]
    line[2] = 'a' + line[2][1:]
    line[6] = 'b' + line[6][1:]
    res2 = '\t'.join(line)
    return res, res2


def changeChrName(line, tonames):
    line = line.split('\t')
    
    for i,d in enumerate([2,6]):
        a = line[d].split('_')
        a[1] = tonames[i]
        line[d] = '_'.join(a)
    for i,d in enumerate([3,7]):
        a = line[d].split('||')
        a[0] = tonames[i]
        line[d] = '||'.join(a)
    
    return '\t'.join(line)


def deleteUnusedFields(line):
    line0 = line
    line =  line.split('\t')
    ks, kn = line[:2]
    chr1, start1, stop1 = line[3].split('||')[:3]
    chr2, start2, stop2 = line[7].split('||')[:3]

    return ','.join([ks,kn,chr1,start1, stop1, chr2, start2, stop2]) + '\n'


def test_singleline():
    off1 = getOffset('6807.json')
    off2 = getOffset('8082.json')
    print off1, off2
    line = '0.1738  0.0081  a6807_4 4||54946689||54949182||Sb04g025090||-1||CDS||19484486||19363||95.64 54949182    54946689    b8082_5 5||180599163||180602043||GRMZM2G029583||1||CDS||56309405||28121||95.64  180599163   180602043   1.000000e-250   11685'
    print line
    line, line = applyOffset(line, off1, off2)
    line = changeChrName(line, ['jack', 'alice'])
    line = deleteUnusedFields(line)
    print line


def test_file():
    gid1 = '6807'
    gid2 = '8082'
    off1 = getOffset(gid1)
    off2 = getOffset(gid2)

    fn = glob('build/data/'+gid1+'_'+gid2+'*.ks')[0]
    with open(fn) as f:
        for line in f.readlines()[10000:10010:2]:
            print line
            print
            l = applyOffset(line, off1, off2)
            l = changeChrName(l, ['jack','alice'])
            print l
            print '-'*20




def changeKsFile(fns, fnout, dictNames, compress=True):
    with open(fnout, 'w') as fout:
        if compress:
            fout.write('ks,kn,chr1,start1,stop1,chr2,start2,stop2\n')
        for fn in fns:
            gid1, gid2 = fn.split('/')[-1].split('.')[0].split('_')
            off1 = getOffset(gid1)
            off2 = getOffset(gid2)

            with open(fn) as f:
                for line in f:
                    if isComment(line):
                        continue
                    l1, l2 = applyOffset(line, off1, off2)
                    l = changeChrName(l1, [dictNames[gid1],dictNames[gid2]])
                    if compress:
                        l  = deleteUnusedFields(l)
                    fout.write(l)
                    l = changeChrName(l2, [dictNames[gid2],dictNames[gid1]])
                    if compress:
                        l = deleteUnusedFields(l)
                    fout.write(l)


def test_changeFile():
    gid1 = '6807'
    gid2 = '8082'
    name1 = 'a'
    name2 = 'b'
    fn = glob('build/data0/'+gid1+'_'+gid2+'*.ks')[0]
    fnout = fn.replace('0','',1)

    changeKsFile(fn, fnout, name1, name2)
    changeMetaFile(gid1, name1)
    changeMetaFile(gid2, name2)

    
def changeMetaFile(gids, names, fnout, organismName=''):
    with open('build/lengths0/6807.json') as f:
        j = json.load(f)
    if j['name']:
        j['name'] = organismName
    j['organism']['name'] = organismName
    j['chromosomes'] = []
    for gid, name in zip(gids, names):
        off = getOffset(gid)
        with open('build/lengths0/'+str(gid)) as f:
            js = json.load(f)
            geneCount = sum([c['gene_count'] for c in js['chromosomes']])
        j['chromosomes'].append( {'name':name, 'length':off[''], 'gene_count':geneCount} )
    with open('build/lengths/'+fnout, 'w') as f:
        json.dump(j, f)



def test_manyFile():
    with open('build/plasmodiumTags.txt') as f:
        lines = [l.replace('\n','') for l in f.readlines()]
        gids = [line.split(',')[1] for line in lines]
        names = [str(i)+line.split(',')[0] for i,line in enumerate(lines)]
    
    filename = sys.argv[2]
    start,stop = [int(i) for i in sys.argv[1].split(',')]
    gids = gids[start:stop]
    names = names[start:stop]
    compress = (sys.argv[3] == 'True')

    organismName = str(len(names)) + ' plasmodiums'
    
    print len(names)
    print names
    print gids
    
    dictNames = dict(zip(gids, names))
    changeMetaFile(gids, names, filename+'.json', organismName=organismName)

    
    fns = []
    for fn in glob('build/data0/plasmodium/*.ks'):
        gid1, gid2 = fn.split('/')[-1].split('.')[0].split('_')
        if gid1 in gids and gid2 in gids:
            fns.append(fn)
    if compress:
        fnout = 'build/data/'+filename+'.compressed.ks'
    else:
        fnout = 'build/data/'+filename+'.ks'
    print len(fns), 'files'
    try:
        os.remove(fnout)
    except OSError:
        pass
    changeKsFile(fns,  fnout, dictNames, compress)
            

if __name__ == '__main__':
   test_manyFile()
   #test_singleline()
