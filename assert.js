function assertEquals(expected, actual, message) {
  if(message === undefined)
    message = String(expected) + " !== " + String(actual);

  if(expected !== actual)
    throw message;
}

function assertTrue(value, message) {
  assertEquals(true, value, message);
}

function assertFalse(value, message) {
  assertEquals(false, value, message);
}
