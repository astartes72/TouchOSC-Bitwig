// Touch OSC Controller Script

loadAPI(1);

host.defineController("TouchOSC", "TouchOSC", "1.0", "847dfbf0-ed5c-11e3-ac10-0800200c9a66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["TouchOSC Bridge"], ["TouchOSC Bridge"]);

// Main variable:
var tOSC;






// Main Setup Function:
function touchOSC() {
  tOSC = this;

  // Constants:
  //this.LOWEST_CC = 1;
  //this.HIGHEST_CC = 20;
	this.FADERS = 101; // Start of Fader Range - 8 x track volume + 1 x master volume
	this.PANS = 91; // Start of Pan Range - 8 x track pan
	this.XY = 12; // Start of the XY Pads - 4 x X and Y, 8 total
	this.MACROS = 20; // Start of Device Macro Range - 8 macro knobs on the cursor device
	this.PARAMS = 40; // Start of Device Parameter Mappings - 8 parameter mappings on the cursor device
	this.PADCENTER = 36; // Start Offset of Pads
	this.PADSTEP = 16; // Pad Pagesize per Step
	this.KEYCENTER = 36; // Start Offset of Pads
	this.KEYSTEP = 12; // Pad Pagesize per Step

	// Midi Port:
	this.midiInKeys = host.getMidiInPort(0).createNoteInput("TouchOSC Keys", "?0????");
	this.midiInPads = host.getMidiInPort(0).createNoteInput("TouchOSC Pads", "?9????");

	// States:
// Two array-variables to hold the values of all the CCs and to check if they have changed
	//this.ccValue = initArray(0, ((tOSC.HIGHEST_CC - tOSC.LOWEST_CC + 1)*16));
  //this.ccValueOld = initArray(0, ((tOSC.HIGHEST_CC - tOSC.LOWEST_CC + 1)*16));

	// Transport:
	this.isPlaying = false;
	this.isRecording = false;
	this.isOverdubEnabled = false;
	this.transpHasChanged = true;

	// Tracks:
	this.masterVolume = 0;
	this.masterVolumeHasChanged = false;
	this.trackVolume = [];
	this.trackVolumeHasChanged = [];
	this.trackPan = [];
	this.trackPanHasChanged = [];
	this.trackExists = [];
	this.deviceMacro = [];
	this.deviceMacroHasChanged = [];
	this.deviceMapping = [];
	this.deviceMappingHasChanged = [];
	this.pageNames = [];
	this.xyPad = [];
	this.xyPadHasChanged = [];
	for (var i=0; i<8; i++) {
		this.trackVolume[i] = 0;
		this.trackVolumeHasChanged[i] = false;
		this.trackPan[i] = 0;
		this.trackPanHasChanged[i] = false;
		this.deviceMacro[i] = 0;
		this.deviceMacroHasChanged[i] = false;
		this.deviceMapping[i] = 0;
		this.deviceMappingHasChanged[i] = false;
		this.xyPad[i] = 0;
		this.xyPadHasChanged[i] = false;
		this.trackExists[i] = false;
	}
	this.trackHasChanged = false;
	this.deviceHasChanged = false;
	this.presetHasChanged = false;
	this.categoryHasChanged = false;
	this.creatorHasChanged = false;
	this.pPageHasChanged = false;

	this.padTranslation = initArray(0, 128);
	this.padOffset = 0;
	this.keyTranslation = initArray(0, 128);
	this.keyOffset = 0;
}


function init()
{
	new touchOSC()

	// Disable the consuming of events by the NoteInputs, so they are also available for mapping
	tOSC.midiInKeys.setShouldConsumeEvents(false);
	tOSC.midiInPads.setShouldConsumeEvents(false);

	// Setting Callbacks for Midi and Sysex
	host.getMidiInPort(0).setMidiCallback(onMidi);
	host.getMidiInPort(0).setSysexCallback(onSysex);

	tOSC.transport = host.createTransport();  // this creates the ability to control transport

	tOSC.transport.addIsPlayingObserver(function(on){
		tOSC.isPlaying = on;
		tOSC.transpHasChanged = true;
	});
	tOSC.transport.addIsRecordingObserver(function(on){
		tOSC.isRecording = on;
		tOSC.transpHasChanged = true;
	});
	tOSC.transport.addOverdubObserver(function(on){
		tOSC.isOverdubEnabled = on;
		tOSC.transpHasChanged = true;
	});

	tOSC.masterTrack = host.createMasterTrack(0);
	tOSC.masterTrack.getVolume().setIndication(true);
	tOSC.masterTrack.getVolume().addValueObserver(128, function(volume){
		tOSC.masterVolume = volume;
		tOSC.masterVolumeHasChanged = true;
	})

	tOSC.tracks = host.createMainTrackBank(8, 0, 0);
	tOSC.cTrack = host.createCursorTrack(1, 0);
	tOSC.cDevice = tOSC.cTrack.getPrimaryDevice();
	tOSC.uMap = host.createUserControls(8);
	tOSC.cMacro = [];
	tOSC.cPage = [];


	for (var i=0; i<8; i++) {
		// Volume
		tOSC.tracks.getTrack(i).getVolume().setIndication(true);
		tOSC.tracks.getTrack(i).getVolume().addValueObserver(127, getTrackValueFunc(i, tOSC.trackVolume, tOSC.trackVolumeHasChanged));
		// Pan
		tOSC.tracks.getTrack(i).getPan().setIndication(true);
		tOSC.tracks.getTrack(i).getPan().addValueObserver(127, getTrackValueFunc(i, tOSC.trackPan, tOSC.trackPanHasChanged));
		// Macro
		tOSC.cMacro[i] = tOSC.cDevice.getMacro(i);
		tOSC.cMacro[i].getAmount().setIndication(true);
		tOSC.cMacro[i].getAmount().addValueObserver(127, getTrackValueFunc(i, tOSC.deviceMacro, tOSC.deviceMacroHasChanged));
		// Parameter Mapping
		tOSC.cPage[i] = tOSC.cDevice.getParameter(i);
		tOSC.cPage[i].setIndication(true);
		tOSC.cPage[i].addValueObserver(127, getTrackValueFunc(i, tOSC.deviceMapping, tOSC.deviceMappingHasChanged));
		// XY Pads
		tOSC.uMap.getControl(i).setLabel("XY Pad " + (Math.ceil(i/2+0.2)) + " - " + ((i%2<1) ? "X":"Y"))
		tOSC.uMap.getControl(i).addValueObserver(127, getTrackValueFunc(i, tOSC.xyPad, tOSC.xyPadHasChanged));
	}

	tOSC.cDevice.addPresetNameObserver(50, "None", function(on)
	{
		if(tOSC.presetHasChanged) {
			host.showPopupNotification(on);
			tOSC.presetHasChanged = false;
		}
	});
	tOSC.cDevice.addPresetCategoryObserver(50, "None", function(on)
	{
		if(tOSC.categoryHasChanged) {
			host.showPopupNotification(on);
			tOSC.categoryHasChanged = false;
		}
	});
	tOSC.cDevice.addPresetCreatorObserver(50, "None", function(on)
	{
		if(tOSC.creatorHasChanged) {
			host.showPopupNotification(on);
			tOSC.creatorHasChanged = false;
		}
	});
	tOSC.cDevice.addNameObserver(50, "None", function(on)
	{
		if(tOSC.deviceHasChanged) {
			host.showPopupNotification(on);
			tOSC.deviceHasChanged = false;
		}
	});
	tOSC.cTrack.addNameObserver(50, "None", function(on)
	{
		if(tOSC.trackHasChanged) {
			host.showPopupNotification(on);
			tOSC.trackHasChanged = false;
		}
	});
	tOSC.cDevice.addPageNamesObserver(function(names)
	{
		tOSC.pageNames = [];
		for(var i=0; i<arguments.length; i++) {
			tOSC.pageNames[i] = arguments[i];
		}
	});
	tOSC.cDevice.addSelectedPageObserver(0, function(on)
	{
		if(tOSC.pPageHasChanged) {
			host.showPopupNotification(tOSC.pageNames[on]);
			tOSC.pPageHasChanged = false;
		}
	});



}

// Updates the controller in an orderly manner when needed
// so that LEDs, Motors etc. react to changes in the Software
// without drowning the Controller with data
function flush()
{
	 if (tOSC.transpHasChanged) {
			sendChannelController(0, 118, tOSC.isPlaying ? 127 : 0);
			sendChannelController(0, 117, tOSC.isPlaying ? 0 : 127);
			sendChannelController(0, 119, tOSC.isRecording ? 127 : 0);
			sendChannelController(0, 114, tOSC.isOverdubEnabled ? 127 : 0);
			tOSC.transpHasChanged = false;
	 }
	 if (tOSC.masterVolumeHasChanged) {
			sendChannelController(0, tOSC.FADERS + 8, tOSC.masterVolume);
			tOSC.masterVolumeHasChanged = false;
			return;
	 }
	 for (var k=0; k<8; k++) {
			if (tOSC.trackVolumeHasChanged[k]) {
				 sendChannelController(0, tOSC.FADERS + k, tOSC.trackVolume[k]);
				 tOSC.trackVolumeHasChanged[k] = false;
			}
			else if (tOSC.trackPanHasChanged[k]) {
				 sendChannelController(0, tOSC.PANS + k, tOSC.trackPan[k]);
				 tOSC.trackPanHasChanged[k] = false;
			}
			else if (tOSC.deviceMacroHasChanged[k]) {
				 sendChannelController(0, tOSC.MACROS + k, tOSC.deviceMacro[k]);
				 tOSC.deviceMacroHasChanged[k] = false;
			}
			else if (tOSC.deviceMappingHasChanged[k]) {
				 sendChannelController(0, tOSC.PARAMS + k, tOSC.deviceMapping[k]);
				 tOSC.deviceMappingHasChanged[k] = false;
			}
			else if (tOSC.xyPadHasChanged[k]) {
				 sendChannelController(0, tOSC.XY + k, tOSC.xyPad[k]);
				 printMidi(0,tOSC.XY + k, tOSC.xyPad[k]);
				 tOSC.xyPadHasChanged[k] = false;
			}
	 }
}

// Update the UserControls when Midi Data is received
function onMidi(status, data1, data2)
{
	 //printMidi(status, data1, data2);

   if (isChannelController(status))
   {
      //if (data1 >= tOSC.LOWEST_CC && data1 <= tOSC.HIGHEST_CC)
      //{
      //   var index = data1 - tOSC.LOWEST_CC + ((tOSC.HIGHEST_CC-tOSC.LOWEST_CC+1) * MIDIChannel(status));
      //   tOSC.userControls.getControl(index).set(data2, 128);
      //}
			if (data1 >= tOSC.FADERS && data1 < tOSC.FADERS + 9 ) {
				 if (data1 === tOSC.FADERS+8) {
						tOSC.masterTrack.getVolume().set(data2, 128);
				 }
				 else {
						tOSC.tracks.getTrack(data1 - tOSC.FADERS).getVolume().set(data2, 128);
				 }
			}
			else if (data1 >= tOSC.PANS && data1 < tOSC.PANS + 8 ) {
				 tOSC.tracks.getTrack(data1 - tOSC.PANS).getPan().set(data2, 128);
			}
			else if (data1 >= tOSC.MACROS && data1 < tOSC.MACROS + 8 ) {
				tOSC.cMacro[data1 - tOSC.MACROS].getAmount().set(data2, 128);
			}
			else if (data1 >= tOSC.PARAMS && data1 < tOSC.PARAMS + 8 ) {
				tOSC.cPage[data1 - tOSC.PARAMS].set(data2, 128);
			}
			else if (data1 >= tOSC.XY && data1 < tOSC.XY + 8 ) {
				tOSC.uMap.getControl(data1 - tOSC.XY).set(data2, 128);
			}
      else if (data2 > 0)
      {
      // checking what CC value we get and react accordingly:
      switch (data1)  {
				 case 99:
						tOSC.tracks.scrollTracksUp();
						break;
				 case 100:
						tOSC.tracks.scrollTracksDown();
						break;
					case 29:
						tOSC.cTrack.selectPrevious();
						tOSC.trackHasChanged = true;
						break;
					case 30:
						tOSC.cTrack.selectNext();
						tOSC.trackHasChanged = true;
						break;
					case 31:
						tOSC.cDevice.switchToDevice(DeviceType.ANY,ChainLocation.PREVIOUS);
						tOSC.deviceHasChanged = true;
					break;
					case 32:
						tOSC.cDevice.switchToDevice(DeviceType.ANY,ChainLocation.NEXT);
						tOSC.deviceHasChanged = true;
					break;
					case 33:
						tOSC.cDevice.switchToPreviousPreset();
						tOSC.presetHasChanged = true;
					break;
					case 34:
						tOSC.cDevice.switchToNextPreset();
						tOSC.presetHasChanged = true;
					break;
					case 35:
						tOSC.cDevice.switchToPreviousPresetCategory();
						tOSC.categoryHasChanged = true;
					break;
					case 36:
						tOSC.cDevice.switchToNextPresetCategory();
						tOSC.categoryHasChanged = true;
					break;
					case 37:
						tOSC.cDevice.switchToPreviousPresetCreator();
						tOSC.creatorHasChanged = true;
					break;
					case 38:
						tOSC.cDevice.switchToNextPresetCreator();
						tOSC.creatorHasChanged = true;
					break;
					case 50:
						tOSC.cDevice.previousParameterPage();
						tOSC.pPageHasChanged = true;
					break;
					case 51:
						tOSC.cDevice.nextParameterPage();
						tOSC.pPageHasChanged = true;
					break;
					case 53:
						if (tOSC.keyOffset < 127-tOSC.KEYCENTER-tOSC.KEYSTEP) {
							tOSC.keyOffset += tOSC.KEYSTEP;
							setNoteTable(tOSC.midiInKeys, tOSC.keyTranslation, tOSC.keyOffset);
							println("up");
						}
					break;
					case 54:
						if (tOSC.keyOffset > 0-tOSC.KEYCENTER+tOSC.KEYSTEP-1) {
							tOSC.keyOffset -= tOSC.KEYSTEP;
							setNoteTable(tOSC.midiInKeys, tOSC.keyTranslation, tOSC.keyOffset);
							println("down");
						}
					break;
					case 55:
						if (tOSC.padOffset < 127-tOSC.PADCENTER-tOSC.PADSTEP) {
							tOSC.padOffset += tOSC.PADSTEP;
							setNoteTable(tOSC.midiInPads, tOSC.padTranslation, tOSC.padOffset);
							println("up");
						}
					break;
					case 56:
						if (tOSC.padOffset > 0-tOSC.PADCENTER+tOSC.PADSTEP-1) {
							tOSC.padOffset -= tOSC.PADSTEP;
							setNoteTable(tOSC.midiInPads, tOSC.padTranslation, tOSC.padOffset);
							println("down");
						}
					break;
         case 117:
            tOSC.transport.stop();
            break;
         case 118:
            tOSC.transport.play();
            break;
         case 113:
            tOSC.transport.restart();
            break;
         case 119:
            tOSC.transport.record();
            break;
         case 114:
            tOSC.transport.toggleOverdub();
            break;
		     }
      }
			else {
				 // hack to get the touchOSC buttons to light up correctly
				 tOSC.transpHasChanged = true;
			}
   }
}

function onSysex(data)
{
	//printSysex(data);
}

// A function to create an indexed function for the Observers
function getValueObserverFunc(index, varToStore)
{
   return function(value)
   {
      varToStore[index] = value;
   }
}

// A function to create an indexed function for the Observers
function getTrackValueFunc(index, varToStore, varToSet)
{
   return function(value)
   {
      varToStore[index] = value;
			varToSet[index] = true;
   }
}

function setNoteTable(midiIn, table, offset) {
  for (var i = 0; i < 128; i++)
	{
		table[i] = offset + i;
		if (table[i] < 0 || table[i] > 127) {
			table[i] = -1;
		}
	}
	midiIn.setKeyTranslationTable(table);
}


function exit()
{
	 // nothing to do here ;-)
}
