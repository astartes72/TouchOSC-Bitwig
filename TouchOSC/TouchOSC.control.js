// Touch OSC Controller Script

loadAPI(1);

host.defineController("TouchOSC", "TouchOSC", "1.0", "847dfbf0-ed5c-11e3-ac10-0800200c9a66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["TouchOSC Bridge"], ["TouchOSC Bridge"]);

// Main variable:
var tOSC;


// Main Constructor where all the basics are set up:
function TouchOSC() {
  tOSC = this;

  // Constants:
	this.FADERS = 101; // Start of Fader Range - 8 x track volume + 1 x master volume
	this.PANS = 91; // Start of Pan Range - 8 x track pan
	this.XY = 12; // Start of the XY Pads - 4 x X and Y, 8 total
	this.MACROS = 20; // Start of Device Macro Range - 8 macro knobs on the cursor device
	this.PARAMS = 40; // Start of Device Parameter Mappings - 8 parameter mappings on the cursor device
	this.PADCENTER = 36; // Start Offset of Pads
	this.PADSTEP = 16; // Pad Pagesize per Step
	this.KEYCENTER = 36; // Start Offset of Pads
	this.KEYSTEP = 12; // Pad Pagesize per Step

	// Midi Ports:
	this.midiInKeys = host.getMidiInPort(0).createNoteInput("TouchOSC Keys", "?0????");
	this.midiInPads = host.getMidiInPort(0).createNoteInput("TouchOSC Pads", "?9????");
	// Disable the consuming of events by the NoteInputs, so they are also available for mapping
	this.midiInKeys.setShouldConsumeEvents(false);
	this.midiInPads.setShouldConsumeEvents(false);

	// Setting Callbacks for Midi and Sysex
	host.getMidiInPort(0).setMidiCallback(onMidi);
	host.getMidiInPort(0).setSysexCallback(onSysex);

	// States:

	// Transport States:
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

	// Macros:
	this.deviceMacro = [];
	this.deviceMacroHasChanged = [];

	// Device Mappings:
	this.deviceMapping = [];
	this.deviceMappingHasChanged = [];
	this.pageNames = [];

	// XY Pads:
	this.xyPad = [];
	this.xyPadHasChanged = [];

	// ClipLauncher:
	this.clIsPlaying = [];
	this.clIsRecording = [];
	this.clIsQueued = [];
	this.clHasContent = [];
	this.clColor = [];
	this.clBright = [];

	// Initializations:
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
		for (var j=0; j<4; j++) {
			this.clIsPlaying[j+i*4] = false;
			this.clIsRecording[j+i*4] = false;
			this.clIsQueued[j+i*4] = false;
			this.clHasContent[j+i*4] = false;
			this.clColor[j+i*4] = 5;
			this.clColor[j+i*4] = false;
		}
	}

	// Change States:
	this.trackHasChanged = false;
	this.deviceHasChanged = false;
	this.presetHasChanged = false;
	this.categoryHasChanged = false;
	this.creatorHasChanged = false;
	this.pPageHasChanged = false;

	// Translation Tables:
	this.padTranslation = initArray(0, 128);
	this.padOffset = 0;
	this.keyTranslation = initArray(0, 128);
	this.keyOffset = 0;

	// Creating Views:
	this.transport = host.createTransport();  // this creates the ability to control transport
	this.masterTrack = host.createMasterTrack(0);
	this.tracks = host.createMainTrackBank(8, 0, 0);
	this.cTrack = host.createCursorTrack(1, 0);
	this.cDevice = tOSC.cTrack.getPrimaryDevice();
	this.uMap = host.createUserControls(8);
	this.cClipWindow = host.createTrackBank(4, 0, 8);
	this.cScenes = tOSC.cClipWindow.getClipLauncherScenes();

	this.cMacro = [];
	this.cPage = [];
	this.cClipTrack = [];
	this.cSlots = [];

}


function init()
{
	// instantiate a new TouchOSC Object:
	new TouchOSC()

	// Creating Observers, indications etc.:

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

	tOSC.masterTrack.getVolume().setIndication(true);

	tOSC.masterTrack.getVolume().addValueObserver(128, function(volume){
		tOSC.masterVolume = volume;
		tOSC.masterVolumeHasChanged = true;
	})

	for (var j=0; j<4; j++) {
		tOSC.cClipTrack[j] = tOSC.cClipWindow.getTrack(j);
		tOSC.cSlots[j] = tOSC.cClipTrack[j].getClipLauncherSlots();
		tOSC.cSlots[j].setIndication(true);
		tOSC.cSlots[j].addIsPlayingObserver(getClipValueFunc(j, tOSC.clIsPlaying));
		tOSC.cSlots[j].addIsRecordingObserver(getClipValueFunc(j, tOSC.clIsRecording));
		tOSC.cSlots[j].addIsQueuedObserver(getClipValueFunc(j, tOSC.clIsQueued));
		tOSC.cSlots[j].addHasContentObserver(getClipValueFunc(j, tOSC.clHasContent));
	}

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
		// Clips
		for(var k=0; k<4; k++) {

		}

	}

	tOSC.tracks.addCanScrollTracksUpObserver(function (on)
	{
		host.getMidiOutPort(0).sendMidi(177, 99, ((on) ? 5 : 0) );
	});

	tOSC.tracks.addCanScrollTracksDownObserver(function (on)
	{
		host.getMidiOutPort(0).sendMidi(177, 100, ((on) ? 5 : 0) );
	});

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

	// Pheww, that was a lot of Boilerplate ;-)

}

// Updates the controller in an orderly manner when needed
// so that LEDs, Motors etc. react to changes in the Software
// without drowning the Controller with data
function flush()
{
	// Check if transport has changed and if yes, update all of the controlls:
	 if (tOSC.transpHasChanged) {
			sendChannelController(0, 118, tOSC.isPlaying ? 127 : 0);
			sendChannelController(0, 117, tOSC.isPlaying ? 0 : 127);
			sendChannelController(0, 119, tOSC.isRecording ? 127 : 0);
			sendChannelController(0, 114, tOSC.isOverdubEnabled ? 127 : 0);
			tOSC.transpHasChanged = false;
	 }
	 // Update the Master Volume if it has changed:
	 if (tOSC.masterVolumeHasChanged) {
			sendChannelController(0, tOSC.FADERS + 8, tOSC.masterVolume);
			tOSC.masterVolumeHasChanged = false;
			return;
	 }
	 // Go through an 8-step Loop to check for all the stuff that could have changed:
	 for (var k=0; k<8; k++) {
			if (tOSC.trackVolumeHasChanged[k]) {
				 sendChannelController(0, tOSC.FADERS + k, tOSC.trackVolume[k]);
				 //sendChannelController(1, tOSC.FADERS + k, tOSC.trackVolume[k]);
				 tOSC.trackVolumeHasChanged[k] = false;
			}
			if (tOSC.trackPanHasChanged[k]) {
				 sendChannelController(0, tOSC.PANS + k, tOSC.trackPan[k]);
				 tOSC.trackPanHasChanged[k] = false;
			}
			if (tOSC.deviceMacroHasChanged[k]) {
				 sendChannelController(0, tOSC.MACROS + k, tOSC.deviceMacro[k]);
				 tOSC.deviceMacroHasChanged[k] = false;
			}
			if (tOSC.deviceMappingHasChanged[k]) {
				 sendChannelController(0, tOSC.PARAMS + k, tOSC.deviceMapping[k]);
				 tOSC.deviceMappingHasChanged[k] = false;
			}
			if (tOSC.xyPadHasChanged[k]) {
				 sendChannelController(0, tOSC.XY + k, tOSC.xyPad[k]);
				 printMidi(0,tOSC.XY + k, tOSC.xyPad[k]);
				 tOSC.xyPadHasChanged[k] = false;
			}
			// Add another 4 step Loop for the Clip Launcher Grid:
			for(var m=0; m<4; m++) {
				host.getMidiOutPort(0).sendMidi(146, m+k*4, tOSC.clColor[m+k*4]);
				host.getMidiOutPort(0).sendMidi(145, m+k*4, (tOSC.clBright[m+k*4]) ? 1 : 0);
				//println(tOSC.clColor[m+k*4]);
			}
		}
}

// React to incoming MIDI:
function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2);

	// Check if it's CC values:
  if (isChannelController(status))
  {
		// Check if its the Volume Faders:
		if (data1 >= tOSC.FADERS && data1 < tOSC.FADERS + 9 ) {
			// Is it the Master Fader?
			if (data1 === tOSC.FADERS+8) {
				tOSC.masterTrack.getVolume().set(data2, 128);
			}
			// Otherwise its a Track Volume Fader:
			else {
				tOSC.tracks.getTrack(data1 - tOSC.FADERS).getVolume().set(data2, 128);
			}
		}
		// Check for Track Panning:
		else if (data1 >= tOSC.PANS && data1 < tOSC.PANS + 8 ) {
			 tOSC.tracks.getTrack(data1 - tOSC.PANS).getPan().set(data2, 128);
		}
		// Check for Device Macros:
		else if (data1 >= tOSC.MACROS && data1 < tOSC.MACROS + 8 ) {
			tOSC.cMacro[data1 - tOSC.MACROS].getAmount().set(data2, 128);
		}
		// Check for Device Mappings:
		else if (data1 >= tOSC.PARAMS && data1 < tOSC.PARAMS + 8 ) {
			tOSC.cPage[data1 - tOSC.PARAMS].set(data2, 128);
		}
		// Check for XY Pads:
		else if (data1 >= tOSC.XY && data1 < tOSC.XY + 8 ) {
			tOSC.uMap.getControl(data1 - tOSC.XY).set(data2, 128);
		}
		// If we got this far, it's not a continuous controller but some one-off Button.
		// We only want to react to it when it's pressed (usually the value is 127 then),
		// not on release, which usually sends a value of 0:
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
				// Checking if the Key-Offset is in a sensible Range before applaying the Offset:
				if (tOSC.keyOffset < 127-tOSC.KEYCENTER-tOSC.KEYSTEP) {
					tOSC.keyOffset += tOSC.KEYSTEP;
					setNoteTable(tOSC.midiInKeys, tOSC.keyTranslation, tOSC.keyOffset);
				}
				break;
			case 54:
				// Same in the other direction:
				if (tOSC.keyOffset > 0-tOSC.KEYCENTER+tOSC.KEYSTEP-1) {
					tOSC.keyOffset -= tOSC.KEYSTEP;
					setNoteTable(tOSC.midiInKeys, tOSC.keyTranslation, tOSC.keyOffset);
				}
				break;
			case 55:
				// Same for Pads
				if (tOSC.padOffset < 127-tOSC.PADCENTER-tOSC.PADSTEP) {
					tOSC.padOffset += tOSC.PADSTEP;
					setNoteTable(tOSC.midiInPads, tOSC.padTranslation, tOSC.padOffset);
				}
				break;
			case 56:
				// And the other way:
				if (tOSC.padOffset > 0-tOSC.PADCENTER+tOSC.PADSTEP-1) {
					tOSC.padOffset -= tOSC.PADSTEP;
					setNoteTable(tOSC.midiInPads, tOSC.padTranslation, tOSC.padOffset);
				}
				break;
			case 57:
				tOSC.cClipWindow.scrollTracksUp();
				break;
			case 58:
				tOSC.cClipWindow.scrollTracksDown();
				break;
			case 59:
				tOSC.cClipWindow.scrollScenesUp();
				break;
			case 60:
				tOSC.cClipWindow.scrollScenesDown();
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
			// hack to get the touchOSC buttons to light up correctly.
			// Many Controllers overwrite their own lights on buttons when the button is
			// released, so here I tell the flush() function to update the buttons to update on release also:
			tOSC.transpHasChanged = true;
		}
	}
	// Now checking for some Note-On Commands I use for the Cliplauncher. First the Scenes:
	else if (isNoteOnC2(status)) {
		if (data1 >=100 && data1 < 108) {
			tOSC.cScenes.launch(data1-100);
		}
		// and then for the Clip Matrix:
		else if (data1 >=0 && data1 <32) {
			// If the clip is Playing or Queued, Stop it:
			if (tOSC.clIsPlaying[data1] || tOSC.clIsQueued[data1]) {
				tOSC.cClipTrack[data1%4].getClipLauncherSlots().stop();
			}
			// otherwise launch it:
			else{
				tOSC.cClipTrack[data1%4].getClipLauncherSlots().launch(Math.floor(data1*0.25));
			}
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

// A function to create an indexed function for the Observers with an added state variable:
function getTrackValueFunc(index, varToStore, varToSet)
{
   return function(value)
   {
      varToStore[index] = value;
			varToSet[index] = true;
   }
}

// A function to create an indexed function for the Observers for Clips including a Color-Update:
function getClipValueFunc(slot, varToStore)
{
   return function(index, value)
   {
      varToStore[slot+index*4] = value;
			updateClipColors();
   }
}

// A function to set the Note Table for Midi Inputs and add / subtrackt an Offset to Transpose:
function setNoteTable(midiIn, table, offset) {
  for (var i = 0; i < 128; i++)
	{
		table[i] = offset + i;
		// if the result is out of the MIDI Note Range, set it to -1 so the Note is not played:
		if (table[i] < 0 || table[i] > 127) {
			table[i] = -1;
		}
	}
	// finally set the Key Translation Table of the respective MidiIn:
	midiIn.setKeyTranslationTable(table);
}

// A function to update Clip Colors collecting all the Observerdata.
// TouchOSC only supports a very limited Palette,
// but in addition Colours can be "On" or "Off", brigher or dimmer:
function updateClipColors () {
	for (var i=0; i<8; i++) {
		for(var j=0; j<4; j++){
			if (tOSC.clIsQueued[j+i*4]) {
				tOSC.clColor[j+i*4] = 3; // Yellow
				tOSC.clBright[j+i*4] = true;
				//println("Yellow");
			}
			else if (tOSC.clIsRecording[j+i*4]) {
				tOSC.clColor[j+i*4] = 0; // Red
				tOSC.clBright[j+i*4] = true;
				//println("Green");
			}
			else if (tOSC.clIsPlaying[j+i*4]) {
				tOSC.clColor[j+i*4] = 1; // Green
				tOSC.clBright[j+i*4] = true;
				//println("Green");
			}
			else if (tOSC.clHasContent[j+i*4]) {
				tOSC.clColor[j+i*4] = 5; // Grau
				tOSC.clBright[j+i*4] = true;
				//println("Orange");
			}
			// if we got so far, the slot is empty:
			else {
				tOSC.clColor[j+i*4] = 5; // Grey
				tOSC.clBright[j+i*4] = false;
				//println("Grey");
			}
		}
	}
}

// Check for Note-Ons on Channel 2
function isNoteOnC2(status) { return (status & 0xF1) == 0x91; }


function exit()
{
	 // nothing to do here ;-)
	 // Au revoir, I hope you enjoy the Tool ;-)
}
