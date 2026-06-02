const { spawn } = require('child_process');
const path = require('path');

module.exports.runtime = {
  handler: async function ({ script_name, arguments_string }) {
    // Restrict execution strictly to the skill's intended Python scripts
    const validScripts = ["init_wiki.py", "append_log.py", "update_index.py", "lint_wiki.py"];
    
    if (!validScripts.includes(script_name)) {
      return `Error: Invalid script name '${script_name}'. Must be one of: ${validScripts.join(', ')}`;
    }

    // Grab the Python executable from the UI settings, default to 'python' for Windows
    const pythonBin = this.runtimeArgs?.PYTHON_BIN || 'python';
    const scriptPath = path.join(__dirname, 'scripts', script_name);
    
    // Parse the space-separated string back into an array of arguments, respecting quote blocks
    const args = arguments_string 
      ? arguments_string.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(arg => arg.replace(/^"|"$/g, '')) || [] 
      : [];

    // Log to the AnythingLLM UI so you can see what the agent is doing
    this.introspect(`Wiki Manager: Running ${script_name}...`);
    this.logger(`Executing: ${pythonBin} ${scriptPath} ${args.join(' ')}`);

    return new Promise((resolve) => {
      const process = spawn(pythonBin, [scriptPath, ...args]);
      
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          this.logger(`Script failed with code ${code}: ${errorOutput}`);
          resolve(`Error running ${script_name} (Code ${code}):\n${errorOutput}\nStandard Output:\n${output}`);
        } else {
          resolve(`Success:\n${output}`);
        }
      });
    });
  }
};