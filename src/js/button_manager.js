const ButtonManager = function() {
    this.enableButton = function(btnName) {
        //const btn = document.querySelector("#" + btnName);
        //btn.removeAttribute("disabled");
        $('#' + btnName).removeAttr("disabled").removeClass("ui-state-disabled");
    };
    this.disableButton = function(btnName) {
        //const btn = document.querySelector("#" + btnName);
        //btn.setAttribute("disabled","disabled");
        $('#' + btnName).attr("disabled", true).addClass("ui-state-disabled");
    };
    this.initButtons = function() {
        // const btnMev = document.querySelector('#btnMev');
        // const btnMef = document.querySelector('#btnMef');
        // const btnMvfs = document.querySelector('#btnMvfs');
        // const btnKemr = document.querySelector('#btnKemr');
        // const btnKfmrh = document.querySelector('#btnKfmrh');
        // const btnSemv = document.querySelector('#btnSemv');
        //
        // btnMev.setAttribute("disabled","disabled");
        // //btnMev.removeAttribute("disabled");
        // btnMef.setAttribute("disabled","disabled");
        // btnMvfs.removeAttribute("disabled");
        // btnKemr.setAttribute("disabled","disabled");
        // btnKfmrh.setAttribute("disabled","disabled");
        // btnSemv.setAttribute("disabled","disabled");

        this.disableButton("btnMev");
        this.disableButton("btnMef");
        this.enableButton("btnMvfs");
        this.disableButton("btnKemr");
        this.disableButton("btnKfmrh");
        this.disableButton("btnSemv");
        this.disableButton("btnSweep");
        this.enableButton("btnBatchRun")
    };
};
