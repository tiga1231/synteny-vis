DEBUG = True

def debug(*args):
    if DEBUG:
        print('DEBUG: ' + ' '.join(str(x) for x in args) + '\n')
