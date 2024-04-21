const initialsUtil = {
  getInitialsFromName: (name) => {
    const letters = String(name)
      .split(" ")
      .map((i) => i.charAt(0));
    return letters.join("");
  },
};

export default initialsUtil;
