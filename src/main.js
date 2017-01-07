/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, log , Mustache, NodeConnection */

define(function (require, exports, module) {
    "use strict";
    
	var CONFIG_FILE = 'clientlibs.combine';
	var CONTEXT_MENU_TEXT = 'Combine Client libs';
	var WILD_CARD_EXP = /(.*)\*(.*)/;
	
	var AppInit = brackets.getModule("utils/AppInit");
    var FileSystem = brackets.getModule("filesystem/FileSystem");
	var ProjectManager = brackets.getModule('project/ProjectManager');
	var Menus = brackets.getModule("command/Menus");
	var CommandManager = brackets.getModule("command/CommandManager");
	var DocumentManager = brackets.getModule("document/DocumentManager");
	
	var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
	var config = { };
	
	var addDirectoriesToFileList = function (fileList, directories) {
		for (var i = 0; i < directories.length; i++) {
			var path = directories[i];
			var wildMatch = WILD_CARD_EXP.exec(path);
			
			if (wildMatch) {
				path = wildMatch[1];
			}
			
			var directory = FileSystem.getDirectoryForPath(ProjectManager.getProjectRoot().fullPath + path);
			directory.getContents(function (error, entries, stats, statsErrors) {
				var j;
				
				for (j = 0; j < entries.length; j++) {
					var relativePath = entries[j].fullPath.substr(ProjectManager.getProjectRoot().fullPath.length);
					
					if (entries[j].isFile) {
						var fileName = entries[j].name;
						
						if (wildMatch && fileName.indexOf(wildMatch[2]) === fileName.length - wildMatch[2].length) {
							fileList.push(relativePath);
						} else if (!wildMatch) {
							fileList.push(relativePath);
						}
					} else if (entries[j].isDirectory) {
						var wildCard = (wildMatch) ? '*' + wildMatch[2] : '';
						addDirectoriesToFileList(fileList, relativePath + wildCard);
					}
				}
			});
		}
	};
	
	var removeFileDuplicates = function () {
		for (var i = 0; i < config.combine.length; i++) {
			var fileMap = {}, uniqueFileList = [];
			for (var j = 0; j < config.combine[i].files.length; j++) {
				var file = config.combine[i].files[j];
				if (fileMap[file]) {
					continue;
				}
				uniqueFileList.push(file);
				fileMap[file] = true;
			}
			config.combine[i].files = uniqueFileList;
		}
	};
	
	var processWildCards = function (callback) {
		for (var i = 0; i < config.combine.length; i++) {
			var combine = config.combine[i], j;
			var directories = [];
			for (j = 0; j < combine.files.length; j++) {
				var file = combine.files[j];
				if (/\/$/.exec(file) || WILD_CARD_EXP.exec(file)) {
					directories.push(file);
				}
			}
			combine.files = combine.files.filter(function (element) {
				return (directories.indexOf(element) < 0);
			});
			addDirectoriesToFileList(combine.files, directories);
		}
		callback();
	};
	
	var parseConfigFile = function (data, callback) {
		config = JSON.parse(data);
		
		for (var i=0; i<config.combine.length; i++) {
			config.combine[i].fileQueue = 0;
		}
		
		removeFileDuplicates();
		processWildCards(callback);
	};
	
	var loadConfigFile = function (callback) {
		var file = FileSystem.getFileForPath(ProjectManager.getProjectRoot().fullPath + CONFIG_FILE);
		file.read(function (error, data, status) {
			if (error) {
				console.log('[brackets-clientlibs-combine] Error loading project config file (' + CONFIG_FILE + '): ' + error);
			} else {
				parseConfigFile(data, callback);
			}
		});
	};
	
	var readFile = function (combine, fileName, readInto, callback) {
		var file = FileSystem.getFileForPath(ProjectManager.getProjectRoot().fullPath + fileName);
		file.read(function (error, data) {
			if (error) {
				console.error('[brackets-clientlibs-combine] Error reading file for combination (' + fileName + '): ' + error);
			} else {
				readInto += data + '\n';
			}
			
			combine.fileQueue--;
			if (combine.fileQueue >= 0) {
				var fileIndex = combine.files.length - 1 - combine.fileQueue;
				readFile(combine, combine.files[fileIndex], readInto, callback);
			} else {
				callback(readInto);
			}
		});
	};
	
	var getFileContents = function (combine, callback) {
		var buildContent = '';
		combine.fileQueue = combine.files.length - 1;
		var fileIndex = combine.files.length - 1 - combine.fileQueue;
		readFile(combine, combine.files[fileIndex], buildContent, callback);
	};
	 
	var writeBuildFile = function (combine, buildFile, startTime) {
		getFileContents(combine, function (data) {
			buildFile.unlink();
			buildFile.write(data, function (error, stats) {
				if (error) {
					console.error('[brackets-clientlibs-combine] Error writing build file: ' + error);
				} else {
					//ProjectManager.refreshFileTree();
					console.log('[brackets-clientlibs-combine] ' + new Date().toLocaleTimeString() 
						+ ' Combinination done succesfully! Duration: ' + (new Date().getTime() - startTime) + ' ms.');
				}
			});
		});
	};
	
	var combineFiles = function () {
		for (var i = 0; i < config.combine.length; i++) {
			(function () {
				var startTime = new Date().getTime();
				var combine = config.combine[i];
				var buildFile = FileSystem.getFileForPath(ProjectManager.getProjectRoot().fullPath + combine.output);
				FileSystem.resolve(buildFile.fullPath, function (error, fileSystemEntry, status) {
					if (!error) {
						writeBuildFile(combine, buildFile, startTime);
					} else {
						var directory = FileSystem.getDirectoryForPath(buildFile.parentPath);
						directory.create(function (error, status) {
							if (error && error !== 'AlreadyExists') {
								console.error('[brackets-clientlibs-combine] Error creating build directory: ' + error);
								return;
							}
							writeBuildFile(combine, buildFile, startTime);
						});
					}
				});
			})(i);
		}
	};
	
	var addContextMenu = function () {
		var CMD = 'clientLibsCombineCmd';
		var divider;
		
		if (!CommandManager.get(CMD)) {
			CommandManager.register(CONTEXT_MENU_TEXT, CMD, function () {
				loadConfigFile(function () {
					combineFiles();
				});
			});
		}
		$(contextMenu).on("beforeContextMenuOpen", function (evt) {
			var selectedItem = ProjectManager.getSelectedItem();
			contextMenu.removeMenuItem(CMD);
			
			if (divider) {
				contextMenu.removeMenuDivider(divider.id);
				divider = null;
			}
			
			if (selectedItem.name === CONFIG_FILE) {
				divider = contextMenu.addMenuDivider(Menus.FIRST);
				contextMenu.addMenuItem(CMD, '', Menus.FIRST, CMD);
			}
		});
	};
	
	var fileIsWatched = function (path) {
		var projPath = ProjectManager.getProjectRoot().fullPath;
		
		if (path === projPath + CONFIG_FILE) {
			return true;
		}
		
		for (var i = 0; i < config.combine.length; i++) {
			for (var j = 0; j < config.combine[i].files.length; j++) {
				if (path === projPath + config.combine[i].files[j]) {
					return true;
				}
			}
		}
        
        return false;
	};
	
	var watchFiles = function () {
		$(DocumentManager).on('documentSaved', function () {
			var document = DocumentManager.getCurrentDocument();
			loadConfigFile(function () {
				if (config.combineOnSave && fileIsWatched(document.file.fullPath)) {
					combineFiles();
				}
			});
		});
	};
	
    AppInit.appReady(function () {
		watchFiles();
		addContextMenu();
    });

});