#include <emscripten.h>
#include "quirc/lib/quirc.h"

struct quirc *ctx = NULL;
struct quirc_data *data = NULL;
struct quirc_code *code = NULL;

int32_t EMSCRIPTEN_KEEPALIVE prepare(int w, int h) {
  if (!ctx) {
    ctx = quirc_new();
    data = calloc(1, sizeof(*data));
    code = calloc(1, sizeof(*code));
  }
  if (!ctx || !data || !code || quirc_resize(ctx, w, h) == -1) {
    return 0;
  }
  return 1;
}

uint8_t * EMSCRIPTEN_KEEPALIVE begin() {
  return quirc_begin(ctx, NULL, NULL);
} 

void EMSCRIPTEN_KEEPALIVE end() {
  return quirc_end(ctx);
}

int32_t EMSCRIPTEN_KEEPALIVE get_count() {
  return quirc_count(ctx);
}

uint8_t * EMSCRIPTEN_KEEPALIVE get(int32_t index) {
  quirc_extract(ctx, index, code);
  quirc_decode_error_t result = quirc_decode(code, data);
  return (result == QUIRC_SUCCESS) ? data->payload : NULL;
}

int32_t EMSCRIPTEN_KEEPALIVE get_length() {
  return data->payload_len;
}

int32_t EMSCRIPTEN_KEEPALIVE get_type() {
  return data->data_type;
}