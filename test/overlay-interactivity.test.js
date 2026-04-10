const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isPointInRect,
  shouldEnableOverlayInteractivity,
} = require('../src/overlay-interactivity');

test('enables overlay interactivity when hovering the status bar', () => {
  assert.equal(
    shouldEnableOverlayInteractivity({
      isHoveringControls: true,
      isSettingsOpen: false,
      isRecording: false,
    }),
    true
  );
});

test('keeps overlay interactive while settings are open', () => {
  assert.equal(
    shouldEnableOverlayInteractivity({
      isHoveringControls: false,
      isSettingsOpen: true,
      isRecording: false,
    }),
    true
  );
});

test('keeps overlay interactive while recording audio', () => {
  assert.equal(
    shouldEnableOverlayInteractivity({
      isHoveringControls: false,
      isSettingsOpen: false,
      isRecording: true,
    }),
    true
  );
});

test('disables overlay interactivity when no clickable area is active', () => {
  assert.equal(
    shouldEnableOverlayInteractivity({
      isHoveringControls: false,
      isSettingsOpen: false,
      isRecording: false,
    }),
    false
  );
});

test('detects whether a pointer is inside a DOMRect-like object', () => {
  const rect = { left: 10, top: 20, right: 110, bottom: 70 };

  assert.equal(isPointInRect({ x: 50, y: 40 }, rect), true);
  assert.equal(isPointInRect({ x: 5, y: 40 }, rect), false);
});
