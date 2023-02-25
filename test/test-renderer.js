export async function withTestRenderer(cb) {
  const { create, act } = await import('react-test-renderer');
  let renderer;
  try {
    await cb({
      render: (el, options) => act(() => renderer = create(el, options)),
      update: (el) => act(() => renderer.update(el)),
      unmount: () => act(() => renderer.unmount()),
      toJSON: () => renderer.toJSON(),
      act,
    });
  } finally {
    if (renderer) {
      renderer.unmount();
    }
  }
}
