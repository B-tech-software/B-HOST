import socket
import sys

try:
    print('Resolving smtp.gmail.com...')
    ai = socket.getaddrinfo('smtp.gmail.com', 587)
    for a in ai:
        print('->', a[4])
except Exception as e:
    print('DNS resolution error:', e)
    sys.exit(2)

try:
    print('\nAttempting TCP connect to smtp.gmail.com:587...')
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(6)
    s.connect(('smtp.gmail.com', 587))
    print('TCP connect succeeded')
    s.close()
except Exception as e:
    print('TCP connect error:', e)
    sys.exit(3)
