(function() {

  var displayHelpersEl = document.querySelector('#display-helpers');
  var displayHelpersSelectionSelector = 'option[value="' + getDisplayHelpers() + '"]';
  function getDisplayHelpers() {
    return localStorage.displayHelpers;
  }
  function setDisplayHelpers(val) {
    return (localStorage.displayHelpers = val);
  }

  displayHelpersEl.addEventListener('change', function(e) {
    setDisplayHelpers(e.target.value);
  });

  var displayHelpersSelection = displayHelpersEl.querySelector(displayHelpersSelectionSelector);
  if (displayHelpersSelection) {
    displayHelpersSelection.selected = true;
  }

})();
