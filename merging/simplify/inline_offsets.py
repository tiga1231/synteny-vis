import sys
from ks2pc import convert_length_file_to_offsets

# input is csv version ks file 

def main(args):
    if len(args) < 3:
        print('Provide a lengths file')
        return 1

    x_lengths = open(args[1]).read()
    y_lengths = open(args[2]).read()
    x_offsets = convert_length_file_to_offsets(x_lengths)
    y_offsets = convert_length_file_to_offsets(y_lengths)

    for line in sys.stdin:
        if line[0] == '#':
            continue
    
        fields = line.strip().split(',')
        aName = fields[3]
        bName = fields[15]
        fields[4] = str(int(fields[4]) + x_offsets[aName])
        fields[5] = str(int(fields[5]) + x_offsets[aName])
        fields[16] = str(int(fields[16]) + y_offsets[bName])
        fields[17] = str(int(fields[17]) + y_offsets[bName])
        print(','.join(fields))

    return 0

if __name__ == '__main__':
    exit(main(sys.argv))
