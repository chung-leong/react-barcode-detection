#!/bin/bash
cd quirc
emmake make libquirc.a
cd ..
emcc quirc.c -s ENVIRONMENT=worker -s MODULARIZE=1 -L./quirc -lquirc -o quirc.js
