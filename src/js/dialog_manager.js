/*
Reference:
https://jqueryui.com/dialog/#modal-form
 */

const DialogManager = function(scene, brep) {

    /**
     *
     * @param {string} buttonName
     * @param {string} dialogName
     * @param {number} height
     * @param {number} width
     * @param {string} initTips
     * @param {Array.<string>} fieldNameArr
     * @param {Array.<function>} fieldCheckFuncArr
     * @param {Array.<string>} fieldErrTipArr
     * @param {function} actionFunc
     * @param {?function} onOpenFunc
     * @param {?function} extraFunc
     */
    this.createDialog = function(
        buttonName,
        dialogName, height = 350, width = 450,
        initTips,
        fieldNameArr, fieldCheckFuncArr, fieldErrTipArr,
        actionFunc,
        onOpenFunc = null,
        extraFunc = null)
    {
        $( function() {
            const button = $( "#" + buttonName );
            const dialog = $( "#" + dialogName );
            const tips = $( "#" + dialogName + " > .validateTips" ).text(initTips);
            const form = dialog.find( "form" );
            const numFields = fieldNameArr.length;
            const fieldArr = fieldNameArr.map( (s) => $("#" + s) );

            function updateTips( t ) {
                tips
                    .text( initTips + "\n\n" + "Error: " + t )
                    .addClass( "ui-state-highlight" );
                setTimeout(function() {
                    tips.removeClass( "ui-state-highlight", 1500 );
                }, 500 );
            }

            function dialogSubmit() {
                const fieldValArr = fieldArr.map( (field) => field.val() );

                for (let i = 0; i < numFields; ++i) {
                    if (! fieldCheckFuncArr[i]( fieldValArr[i] )) {
                        fieldArr[i].addClass( "ui-state-error" );
                        updateTips( fieldErrTipArr[i] );
                        return false;
                    }
                }

                actionFunc(...fieldValArr);
                return true;
            }

            function clearFieldsError() {
                fieldArr.map((field) => field.removeClass( "ui-state-error" ));
            }

            function dialogPressOk() {
                clearFieldsError();
                if (dialogSubmit()) {
                    dialog.dialog( "close" );
                }
            }

            dialog.dialog({
                autoOpen: false,
                height: height,
                width: width,
                modal: false,
                buttons: {
                    "OK":  dialogPressOk,
                    Cancel: function() {
                        dialog.dialog( "close" );
                    }
                },
                close: function() {
                    form[ 0 ].reset();
                    tips.text(initTips);
                    clearFieldsError();
                },
                open: onOpenFunc,
            });

            form.on( "submit", function( event ) {
                event.preventDefault();
                dialogPressOk();
            });

            button.button().on( "click", function() {
                dialog.dialog( "open" );
            });

            if(extraFunc) extraFunc();
        } );
    };

    this.initDialogs = function() {
        function checkFloat(strVal) {
            const regexFloat = /^[+\-]?\d*\.?\d+(?:[Ee][+\-]?\d+)?$/;
            return regexFloat.test(strVal);
        }
        function checkNaturalNumber(strVal) {
            return Number.isSafeInteger(Number(strVal)) && Number.parseInt(strVal) >= 0;
        }

        this.createDialog(
            "btnMvfs",
            "dialog-mvfs", 350, 450,
            "Please enter the coordinates of the new vertex.",
            [
                "dialog-mvfs-x",
                "dialog-mvfs-y",
                "dialog-mvfs-z",
            ],
            [
                checkFloat,
                checkFloat,
                checkFloat,
            ],
            [
                "Please enter a real number for x",
                "Please enter a real number for y",
                "Please enter a real number for z",
            ],
            function(x, y, z) {
                brep.deselect_all();
                brep.mvfs(new THREE.Vector3(Number(x), Number(y), Number(z)));
            }
        );

        this.createDialog(
            "btnMev",
            "dialog-mev", 450, 450,
            "Please specify the existing vertex and loop, and enter the coordinates of the new vertex.",
            [
                "dialog-mev-v-id",
                "dialog-mev-lp-id",
                "dialog-mev-x",
                "dialog-mev-y",
                "dialog-mev-z",
            ],
            [
                checkNaturalNumber,
                checkNaturalNumber,
                checkFloat,
                checkFloat,
                checkFloat,
            ],
            [
                "Please enter a non-negative integer for id of existing vertex",
                "Please enter a non-negative integer for id of existing loop",
                "Please enter a real number for x of new vertex",
                "Please enter a real number for y of new vertex",
                "Please enter a real number for z of new vertex",
            ],
            function(v_ord, lp_ord, x, y, z) {
                brep.deselect_all();
                brep.mev(Number(v_ord), Number(lp_ord), new THREE.Vector3(Number(x), Number(y), Number(z)));
            }
        );

        this.createDialog(
            "btnMef",
            "dialog-mef", 400, 500,
            "Please specify an existing loop and two existing vertices on the loop.",
            [
                "dialog-mef-v1-id",
                "dialog-mef-v2-id",
                "dialog-mef-lp-id",
            ],
            [
                checkNaturalNumber,
                checkNaturalNumber,
                checkNaturalNumber,
            ],
            [
                "Please enter a non-negative integer for id of the first existing vertex",
                "Please enter a non-negative integer for id of the second existing vertex",
                "Please enter a non-negative integer for id of existing loop",
            ],
            function(v1_ord, v2_ord, lp_ord) {
                brep.deselect_all();
                brep.mef(Number(v1_ord), Number(v2_ord), Number(lp_ord));
            }
        );

        this.createDialog(
            "btnKemr",
            "dialog-kemr", 400, 500,
            "Please specify an existing edge whose two half-edges are in the same loop.",
            [
                "dialog-kemr-e-id",
            ],
            [
                checkNaturalNumber,
            ],
            [
                "Please enter a non-negative integer for id of existing edge",
            ],
            function(e_ord) {
                brep.deselect_all();
                brep.kemr(Number(e_ord));
            }
        );

        this.createDialog(
            "btnKfmrh",
            "dialog-kfmrh", 400, 500,
            "Please specify two existing faces that lie on the same plane.",
            [
                "dialog-kfmrh-f1-id",
                "dialog-kfmrh-f2-id",
            ],
            [
                checkNaturalNumber,
                checkNaturalNumber,
            ],
            [
                "Please enter a non-negative integer for id of 1st existing face",
                "Please enter a non-negative integer for id of 2nd existing face",
            ],
            function(f1_ord, f2_ord) {
                brep.deselect_all();
                brep.kfmrh(Number(f1_ord), Number(f2_ord));
            }
        );

        this.createDialog(
            "btnSemv",
            "dialog-semv", 400, 500,
            "Please specify an existing Edge and the coordinates of the new Vertex.",
            [
                "dialog-semv-e-id",
                "dialog-semv-x",
                "dialog-semv-y",
                "dialog-semv-z",
            ],
            [
                checkNaturalNumber,
                checkFloat,
                checkFloat,
                checkFloat,
            ],
            [
                "Please enter a non-negative integer for id of existing edge",
                "Please enter a real number for x of new vertex",
                "Please enter a real number for y of new vertex",
                "Please enter a real number for z of new vertex",
            ],
            function(e_ord, x, y, z) {
                brep.deselect_all();
                brep.semv(Number(e_ord), new THREE.Vector3(Number(x), Number(y), Number(z)));
            }
        );

        this.createDialog(
            "btnSweep",
            "dialog-sweep", 400, 550,
            "Please specify an existing face and the movement vector.",
            [
                "dialog-sweep-f-id",
                "dialog-sweep-x",
                "dialog-sweep-y",
                "dialog-sweep-z",
            ],
            [
                checkNaturalNumber,
                checkFloat,
                checkFloat,
                checkFloat,
            ],
            [
                "Please enter a non-negative integer for id of existing face",
                "Please enter a real number for x of movement vector",
                "Please enter a real number for y of movement vector",
                "Please enter a real number for z of movement vector",
            ],
            function(f_ord, x, y, z) {
                brep.deselect_all();
                brep.sweep(Number(f_ord), new THREE.Vector3(Number(x), Number(y), Number(z)));
            }
        );

        const testcases = [
            // testcase 1
            "mvfs 0 0 0"            + "\n" +    // cube (Solid #0)
            "mev 0 0 2 0 0"         + "\n" +
            "mev 1 0 2 2 0"         + "\n" +
            "mev 2 0 0 2 0"         + "\n" +
            "mef 0 3 0"             + "\n" +
            "mev 0 1 0 0 2"         + "\n" +
            "mev 1 1 2 0 2"         + "\n" +
            "mev 2 1 2 2 2"         + "\n" +
            "mev 3 1 0 2 2"         + "\n" +
            "mef 4 5 1"             + "\n" +
            "mef 5 6 1"             + "\n" +
            "mef 6 7 1"             + "\n" +
            "mef 7 4 1"             + "\n" +
            "mev 6 1 1.5 1.5 2"     + "\n" +    // 1st hole
            "mev 8 1 1.5 0.5 2"     + "\n" +
            "mev 9 1 0.5 0.5 2"     + "\n" +
            "mev 10 1 0.5 1 2"      + "\n" +
            "mef 11 8 1"            + "\n" +
            "kemr 12"               + "\n" +
            "mev 8 1 1.5 1.5 0"     + "\n" +
            "mev 9 1 1.5 0.5 0"     + "\n" +
            "mev 10 1 0.5 0.5 0"    + "\n" +
            "mev 11 1 0.5 1 0"      + "\n" +
            "mef 12 13 1"           + "\n" +
            "mef 13 14 8"           + "\n" +
            "mef 14 15 9"           + "\n" +
            "mef 15 12 10"          + "\n" +
            "kfmrh 0 10"            + "\n" +
            "mev 10 8 0.7 0.5 1.5"  + "\n" +    // 2nd hole
            "kemr 25"               + "\n" +
            "mev 16 12 0.7 0.5 0.5" + "\n" +
            "mev 17 12 1.2 0.5 0.5" + "\n" +
            "mev 18 12 1.2 0.5 1.5" + "\n" +
            "mef 16 19 12"          + "\n" +
            "mev 16 13 0.7 0 1.5"   + "\n" +
            "mev 20 13 1.2 0 1.5"   + "\n" +
            "mef 21 19 13"          + "\n" +
            "mev 21 13 1.2 0 0.5"   + "\n" +
            "mef 22 18 13"          + "\n" +
            "mev 22 13 0.7 0 0.5"   + "\n" +
            "mef 23 17 13"          + "\n" +
            "mef 23 20 13"          + "\n" +
            "kfmrh 11 2"            + "\n" +
            "mvfs 0.5 2 0.5"        + "\n" +    // protuberance (Solid #1)
            "mev 24 18 1.5 2 0.5"   + "\n" +
            "mev 25 18 1.5 2 1.5"   + "\n" +
            "mev 26 18 0.5 2 1.5"   + "\n" +
            "mef 24 27 18"          + "\n" +
            "mev 24 18 0.5 3 0.5"   + "\n" +
            "mev 25 18 1.5 3 0.5"   + "\n" +
            "mev 26 18 1.5 2.5 1.5" + "\n" +
            "mev 27 18 0.5 2.5 1.5" + "\n" +
            "mef 28 29 18"          + "\n" +
            "mef 29 30 20"          + "\n" +
            "mef 30 31 21"          + "\n" +
            "mef 31 28 22"          + "\n" +
            "kfmrh 17 4"            + "\n",

            // testcase 2
            "mvfs 0 0 0"            + "\n" +    // cube (Solid #0)
            "mev 0 0 2 0 0"         + "\n" +
            "mev 1 0 2 2 0"         + "\n" +
            "mev 2 0 0 2 0"         + "\n" +
            "mef 0 3 0"             + "\n" +
            "mef 0 2 1"             + "\n" +
            "semv 4 1 1 1"          + "\n" +
            "mef 4 3 1"             + "\n" +
            "mef 4 1 2"             + "\n" +
            "semv 2 1 1.7 0"        + "\n" +
            "mef 5 4 3"             + "\n" +
            "semv 0 1 0.3 0"        + "\n" +
            "mef 4 6 4"             + "\n",

            // testcase 3 (sweep, simple)
            "mvfs 1 0 0"                                               + "\n" +    // outer loop (pentagon)
            "mev 0 0 0.30901699437494723 -0.9510565162951536 0"        + "\n" +
            "mev 1 0 -0.8090169943749475 -0.587785252292473 0"         + "\n" +
            "mev 2 0 -0.8090169943749473 0.5877852522924732 0"         + "\n" +
            "mev 3 0 0.30901699437494745 0.9510565162951535 0"         + "\n" +
            "mef 0 4 0"                                                + "\n" +
            "sweep 0 0.5 0 1"                                          + "\n",

            // testcase 4 (sweep, with inner loops)
            "mvfs 1 0 0"                                               + "\n" +    // outer loop (pentagon)
            "mev 0 0 0.30901699437494723 -0.9510565162951536 0"        + "\n" +
            "mev 1 0 -0.8090169943749475 -0.587785252292473 0"         + "\n" +
            "mev 2 0 -0.8090169943749473 0.5877852522924732 0"         + "\n" +
            "mev 3 0 0.30901699437494745 0.9510565162951535 0"         + "\n" +
            "mef 0 4 0"                                                + "\n" +
            "mev 0 1 0.5 0 0"                                          + "\n" +    // hole (star)
            "kemr 5"                                                   + "\n" +
            "mev 5  2 0.1618033988749895 0.11755705045849463 0"        + "\n" +
            "mev 6  2 0.15450849718747373 0.47552825814757677 0"       + "\n" +
            "mev 7  2 -0.06180339887498947 0.19021130325903074 0"      + "\n" +
            "mev 8  2 -0.40450849718747367 0.2938926261462366 0"       + "\n" +
            "mev 9  2 -0.2 0 0"                                        + "\n" +
            "mev 10 2 -0.4045084971874737 -0.2938926261462365 0"       + "\n" +
            "mev 11 2 -0.061803398874989514 -0.1902113032590307 0"     + "\n" +
            "mev 12 2 0.15450849718747361 -0.4755282581475768 0"       + "\n" +
            "mev 13 2 0.16180339887498948 -0.11755705045849468 0"      + "\n" +
            "mef 14 5 2"                                               + "\n" +
            "mev 0 1 0.2427050983124842 0.17633557568774194 0"         + "\n" +    // hole (triangle)
            "mev 15 1 0.24721359549995797 0.7608452130361228 0"        + "\n" +
            "mev 16 1 0.8 0 0"                                         + "\n" +
            "mef 15 17 1"                                              + "\n" +
            "kemr 16"                                                  + "\n" +
            "sweep 0 0.5 0 1"                                          + "\n",

            /*
            for i in range(5):
                print(0.5*math.cos(2*pi/5*i), 0.5*math.sin(2*pi/5*i))
                print(0.2*math.cos(2*pi/5*(i+0.5)), 0.2*math.sin(2*pi/5*(i+0.5)))
             */

            // // testcase 4
            // "mvfs 0 0 0"            + "\n" +
            // "mev 0 0 2 0 0"         + "\n" +
            // "mev 1 0 2 2 0"         + "\n" +
            // "mev 2 0 0 2 0"         + "\n" +
            // "mef 0 3 0"             + "\n" +
            // "mev 0 1 0 0 2"         + "\n" +
            // "mev 1 1 2 0 2"         + "\n" +
            // "mev 2 1 2 2 2"         + "\n" +
            // "mev 3 1 0 2 2"         + "\n" +
            // "mef 4 5 1"             + "\n" +
            // "mef 5 6 1"             + "\n" +
            // "mef 6 7 1"             + "\n" +
            // "mef 7 4 1"             + "\n" +
            // "mev 6 1 1 1 2"         + "\n" +
            // "kemr 12"               + "\n",
            //
            // // testcase 5
            // "mvfs 0 0 0"    + "\n" +
            // "mev 0 0 2 0 0" + "\n" +
            // "mev 1 0 2 2 0" + "\n" +
            // "mev 2 0 0 2 0" + "\n" +
            // "mef 0 3 0"     + "\n" +
            // "mev 0 1 1 1 0" + "\n" +
            // "mef 1 4 1"     + "\n",
            //
            // // testcase 6
            // "mvfs 0 0 0"            + "\n" +
            // "mev 0 0 2 0 0"         + "\n" +
            // "mev 1 0 2 2 0"         + "\n" +
            // "mev 2 0 0 2 0"         + "\n" +
            // "mev 3 0 1 1 0"         + "\n" +
            // "mef 4 0 0"             + "\n",
            //
            // // testcase 7
            // "mvfs 0 0 0"            + "\n" +
            // "mev 0 0 2 0 0"         + "\n" +
            // "mev 1 0 2 2 0"         + "\n" +
            // "mev 2 0 0 2 0"         + "\n" +
            // "mev 3 0 0 1 0"         + "\n" +
            // "mev 4 0 1 1 0"         + "\n" +
            // "mev 5 0 1 1.5 0"       + "\n" +
            // "mev 6 0 1.5 1.5 0"     + "\n" +
            // "mev 7 0 1.5 1 0"       + "\n" +
            // "mev 8 0 0 1 0"         + "\n" +
            // "mef 9 0 0"             + "\n",
        ];
        for (let i = testcases.length - 1; i >= 0; --i) {
            const btnClear = $("#btnBatchRun_clear");
            const btnTestcase = "btnBatchRun_testcase_" + (i + 1);
            btnClear.after("<button id=" + btnTestcase + ">Testcase " + (i+1) + "</button>");
        }
        this.createDialog(
            "btnBatchRun",
            "dialog-batch-run", 500, 600,
            "Please enter Euler operations, one per line. " +
            "Parameters should be separated by spaces. " +
            "Click the buttons below to use predefined testcases.",
            [
                "dialog-batch-run-commands",
            ],
            [
                () => true,
            ],
            [
                "",
            ],
            function(comm) {
                brep.deselect_all();
                brep.batchRun(comm);
            },
            function() {
                const textArea = $("#dialog-batch-run-commands");
                //textArea.val(testcase_1);
                textArea.val("");
            },
            function() {
                const textArea = $("#dialog-batch-run-commands");
                $("#btnBatchRun_clear").button().on( "click", function(e) {
                    e.preventDefault();
                    textArea.val("");
                });
                // $("#btnBatchRun_testcase_1").button().on( "click", function(e) {
                //     e.preventDefault();
                //     textArea.val(testcase_1);
                // });

                for (let i = 0; i < testcases.length; ++i) {
                    const btn = $("#btnBatchRun_testcase_" + (i + 1));
                    btn.button().on("click", function(e) {
                        e.preventDefault();
                        textArea.val(testcases[i]);
                    });
                }
            }
        );
    };

    // dialog-mvfs
    // $( function() {
    //     let dialog, form,
    //         initTips = "Please enter the coordinates of the new vertex.",
    //         regexFloat = /^[+\-]?\d*\.?\d+(?:[Ee][+\-]?\d+)?$/,
    //         x = $( "#dialog-mvfs-x" ),
    //         y = $( "#dialog-mvfs-y" ),
    //         z = $( "#dialog-mvfs-z" ),
    //         allFields = $( [] ).add( x ).add( y ).add( z ),
    //         tips = $( "#dialog-mvfs > .validateTips" );
    //
    //     function updateTips( t ) {
    //         tips
    //             .text( initTips + "\n\n" + "Error: " + t )
    //             .addClass( "ui-state-highlight" );
    //         setTimeout(function() {
    //             tips.removeClass( "ui-state-highlight", 1500 );
    //         }, 500 );
    //     }
    //
    //     function checkRegexp( o, regexp, n ) {
    //         if ( !( regexp.test( o.val() ) ) ) {
    //             o.addClass( "ui-state-error" );
    //             updateTips( n );
    //             return false;
    //         } else {
    //             return true;
    //         }
    //     }
    //
    //     function dialogSubmit() {
    //         let valid = true;
    //
    //         valid = valid && checkRegexp( x, regexFloat, "Please enter a number for x." );
    //         valid = valid && checkRegexp( y, regexFloat, "Please enter a number for y." );
    //         valid = valid && checkRegexp( z, regexFloat, "Please enter a number for z." );
    //
    //         /*
    //         if ( valid ) {
    //             alert(x.val() + " " + y.val() + " " + z.val())
    //             dialog.dialog( "close" );
    //         }
    //         */
    //
    //         if (valid) {
    //             let pt = new THREE.Vector3(x.val(), y.val(), z.val());
    //             brep.mvfs(pt);
    //         }
    //
    //         return valid;
    //     }
    //
    //     function dialogPressOk() {
    //         allFields.removeClass( "ui-state-error" );
    //         if (dialogSubmit()) {
    //             dialog.dialog( "close" );
    //         }
    //     }
    //
    //     dialog = $( "#dialog-mvfs" ).dialog({
    //         autoOpen: false,
    //         height: 350,
    //         width: 450,
    //         modal: true,
    //         buttons: {
    //             "OK":  dialogPressOk,
    //             Cancel: function() {
    //                 dialog.dialog( "close" );
    //             }
    //         },
    //         close: function() {
    //             form[ 0 ].reset();
    //             tips.text(initTips);
    //             allFields.removeClass( "ui-state-error" );
    //         }
    //     });
    //
    //     // dialog.keypress(function(e) {
    //     //     if (e.keyCode === $.ui.keyCode.ENTER) {
    //     //         dialogPressOk();
    //     //     }
    //     // });
    //     form = dialog.find( "form" ).on( "submit", function( event ) {
    //         event.preventDefault();
    //         dialogPressOk();
    //     });
    //
    //     $( "#btnMvfs" ).button().on( "click", function() {
    //         dialog.dialog( "open" );
    //     });
    //
    //     tips.text(initTips);
    // } );

};
