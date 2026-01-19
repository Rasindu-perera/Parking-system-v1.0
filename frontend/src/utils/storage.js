// Storage utility for session management
// Uses sessionStorage to allow multiple users in different tabs simultaneously

const storage = {
  setItem: (key, value) => {
    sessionStorage.setItem(key, value);
  },
  
  getItem: (key) => {
    return sessionStorage.getItem(key);
  },
  
  removeItem: (key) => {
    sessionStorage.removeItem(key);
  },
  
  clear: () => {
    sessionStorage.clear();
  }
};

export default storage;
