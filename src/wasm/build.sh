#!/bin/bash
cd quirc
emmake make CFLAGS="-DQUIRC_MAX_REGIONS=65534" libquirc.a
cd ..
emcc quirc.c -s ENVIRONMENT=worker -s MODULARIZE=1 -L./quirc -lquirc -O3 -o quirc.cjs
