(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.NaviOverlayInteractivity = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isPointInRect(point, rect) {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }

  function shouldEnableOverlayInteractivity(context) {
    return Boolean(
      context.isHoveringControls ||
      context.isSettingsOpen ||
      context.isRecording
    );
  }

  return {
    isPointInRect,
    shouldEnableOverlayInteractivity,
  };
});
