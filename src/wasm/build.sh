#!/bin/bash
cd quirc
QUIRC_MAX_REGIONS=65534 emmake make libquirc.a
cd ..
emcc quirc.c -s ENVIRONMENT=worker -s MODULARIZE=1 -L./quirc -lquirc -O3 -o quirc.js
