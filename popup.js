const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

// Load current state
chrome.storage.local.get(['jtaEnabled'], (result) => {
  const enabled = result.jtaEnabled !== false; // default true
  updateUI(enabled);
});

// Toggle click handler
toggle.addEventListener('click', () => {
  chrome.storage.local.get(['jtaEnabled'], (result) => {
    const currentState = result.jtaEnabled !== false;
    const newState = !currentState;
    
    chrome.storage.local.set({ jtaEnabled: newState }, () => {
      updateUI(newState);
      
      // Notify all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleExtension',
            enabled: newState
          }).catch(() => {}); // Ignore errors for tabs without content script
        });
      });
    });
  });
});

function updateUI(enabled) {
  if (enabled) {
    toggle.classList.add('on');
    status.textContent = 'Extension is enabled';
    status.className = 'status enabled';
  } else {
    toggle.classList.remove('on');
    status.textContent = 'Extension is disabled';
    status.className = 'status disabled';
  }
}
