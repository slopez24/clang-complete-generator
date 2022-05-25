'use babel';

import ClangCompleteGeneratorView from './clang-complete-generator-view';
import { CompositeDisposable } from 'atom';

export default {

  clangCompleteGeneratorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.clangCompleteGeneratorView = new ClangCompleteGeneratorView(state.clangCompleteGeneratorViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.clangCompleteGeneratorView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that generates this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'clang-complete-generator:generate': () => this.generate()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.clangCompleteGeneratorView.destroy();
  },

  serialize() {
    return {
      clangCompleteGeneratorViewState: this.clangCompleteGeneratorView.serialize()
    };
  },

  generate() {
    let projectPath = atom.project.getPaths()[0]; //Get the project path first
    let clangCompleteFileData;  //String array with all the paths

    //Function to get the list of all the folders (recursive)
    let fs = require('fs');
    let path = require('path');
    let walk = function(dir, done) {
      let results = [];
      fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        let i = 0;
        (function next() {
          let file = list[i++];
          if (!file) return done(null, results);
          file = path.resolve(dir, file);
          fs.stat(file, function(err, stat) {
            if (stat && stat.isDirectory()) {
              results.push(file);
              walk(file, function(err, res) {
                results = results.concat(res);
                next();
              });
            } else {
              next();
            }
          });
        })();
      });
    };

    //Include the Project Path first
    clangCompleteFileData = '-I'+projectPath+'\n'

    //Get all the paths in the project and add them to the data string
    walk(projectPath, function(err, results) {
      if (err) throw err;
      results.forEach((folderPath) => {
        console.log('Found '+ folderPath);
        clangCompleteFileData = clangCompleteFileData + '-I' + folderPath + '\n';
      });
      //Create the new .clang_file with all the paths
      fs.writeFile(projectPath + '/.clang_complete', clangCompleteFileData, function(err) {
        if (err) {
          return console.log(err);
        }
        console.log(".clang_complete file created");
      });
    });

  }
};
