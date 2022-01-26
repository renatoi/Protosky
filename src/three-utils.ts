export const resizeRendererToDisplaySize = (renderer: THREE.Renderer): boolean => {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    renderer.setSize(width, height, false);
  }

  return needResize;
}


/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
 export const getRandomArbitrary = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
}
