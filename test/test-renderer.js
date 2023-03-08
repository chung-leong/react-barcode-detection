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

export async function withSilentConsole(cb, dest = {}) {
  function save(name, s) {
    const target = dest[name];
    if (target instanceof Array)  {
      target.push(s);
    } else {
      dest[name] = s;
    }
  }
  const functions = [ 'debug', 'notice', 'log', 'warn', 'error'];
  const originalFns = {};
  functions.forEach(name => {
    originalFns[name] = console[name];
    console[name] = arg => save(name, arg);
  });
  try {
    await cb();
  } finally {
    functions.forEach(name => console[name] = originalFns[name]);
  }
}
