/*
[1] The module pattern
https://javascriptweblog.wordpress.com/2010/12/07/namespacing-in-javascript/

[2] Show labels
http://stemkoski.github.io/Three.js/Topology-Data.html
 */

const Brep = function(scene, renderManager, buttonManager) {

    // private

    const msgBox = document.getElementById("msgBox");
    //const treeView = brepTreeViewSelector.jstree(true); // get the existing instance
    const treeNode_globalSolids = 'globalSolids';
    const treeNode_globalEdges = 'globalEdges';
    const treeNode_globalVertices = 'globalVertices';

    const dotMaterialPlain = ThreejsHelper.createDotMaterial(new THREE.Color('white'), 0.1);
    //const dotMaterialSelected = ThreejsHelper.createDotMaterial('#dc134c', 0.2); // crimson
    //const dotMaterialSelected = ThreejsHelper.createDotMaterial('#8b0000', 0.2); // dark red
    const dotMaterialSelected = ThreejsHelper.createDotMaterial('#F39C12', 0.2); // orange
    const lineMaterialPlain = new THREE.LineBasicMaterial( { color: 0xFFFFFF } );  // white
    const lineMaterialSelected = new THREE.LineBasicMaterial( { color: 0xFF8C00 } ); // dark orange
    const lineMeshMaterialPlain = new MeshLineMaterial( {
        color: 0xFFFFFF,    // white
        lineWidth: 0.03,
        sizeAttenuation: 1, // attenuate
    } );
    const lineMeshMaterialSelected = new MeshLineMaterial( {
        color: 0xFF8C00,    // dark orange
        lineWidth: 0.05,
        sizeAttenuation: 1, // attenuate
    } );
    const arrowHeadColorHex = 0x34495E; // dark bluish gray
    const faceMaterialPlain = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x5DADE2), // light blue
    });
    const faceMaterialSelected = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xFCF3CF), // light orange
    });
    const geoEpsilon = 1e-5;

    let nSolids = 0;
    let nFaces = 0;
    let nLoops = 0;
    let nHalfEdges = 0;
    let nEdges = 0;
    let nVertices = 0;

    const globalSolids = new Map();
    const globalFaces = new Map();
    const globalLoops = new Map();
    const globalHalfEdges = new Map();
    const globalEdges = new Map();
    const globalVertices = new Map();

    const TreeNodeType = {
        SOLID: 'Solid',
        FACE: 'Face',
        //LOOP: 'Loop',
        LOOP_INNER: 'Loop (inner)',
        LOOP_OUTER: 'Loop (outer)',
        HALF_EDGE: 'HalfEdge',
        //EDGE: 'Edge',
        EDGE_GLOBAL: 'Edge',
        //VERTEX: 'Vertex',
        VERTEX_1_OF_HE: 'Vertex 1 of HalfEdge',
        VERTEX_2_OF_HE: 'Vertex 2 of HalfEdge',
        VERTEX_GLOBAL: 'Vertex'
    };
    const treeViewNodes = new Map();

    function createTreeNode(type, obj, extra) {
        const treeNode = {
            data: { ...obj.id },
            text: obj.displayName,
        };
        switch(type) {
            case TreeNodeType.SOLID:
                break;
            case TreeNodeType.FACE:
                break;
            case TreeNodeType.LOOP_INNER:
                //treeNode.text += " (inner loop)";
                //treeNode.data.type = "Loop";
                break;
            case TreeNodeType.LOOP_OUTER:
                //treeNode.text += " (outer loop)";
                //treeNode.data.type = "Loop";
                break;
            case TreeNodeType.HALF_EDGE:
                //treeNode.data.e_ord = obj.e.ord;
                treeNode.text += " of Edge #" + obj.e.ord;
                break;
            case TreeNodeType.EDGE_GLOBAL:
                break;
            case TreeNodeType.VERTEX_1_OF_HE:
            case TreeNodeType.VERTEX_2_OF_HE:
                treeNode.data.type = type;
                treeNode.data.he_ord = extra;
                treeNode.data.toString = function() {
                    return this.type + ' #' + this.he_ord;
                };
                break;
            case TreeNodeType.VERTEX_GLOBAL:
                //ret.data.update(type);
                treeNode.data.type = type;
                break;
            default:
                break;
        }
        treeNode.id = treeNode.data.toString();
        treeViewNodes.set(treeNode.id, treeNode);
        return treeNode;
    }
    function removeTreeNode(id) {
        //const node = treeViewNodes.get(id);
        //treeView.delete_node(node);
        //const par = brepTreeViewSelector.jstree(true).get_parent(id);
        brepTreeViewSelector.jstree(true).delete_node(id);
        //brepTreeViewSelector.jstree("refresh");
        treeViewNodes.delete(id);
    }
    function initBrepElement(elem, type, counter, msgLabel) {
        elem.type = type;
        elem.ord = counter;
        elem.displayName = elem.type + ' #' + elem.ord;
        elem.id = {
            type: elem.type,
            ord: elem.ord,
            toString: function() {return this.type + ' #' + this.ord;},
            // update: function(newType = this.type, newOrd = this.ord) {
            //     this.type = newType;
            //     this.ord = newOrd;
            //     this.toString = () => (newType + ' #' + newOrd);
            // },
        };

        // can be selected as a B-rep Tree View node
        elem.isSelected = false;

        // print to message box
        if (msgLabel) {
            printMsg(msgLabel, "created " + elem.displayName);
        }
    }
    function brepElementChangeType(elem, newType) {
        elem.type = newType;
        elem.displayName = elem.type + ' #' + elem.ord;
        elem.id = {
            type: elem.type,
            ord: elem.ord,
            toString: function() {return this.type + ' #' + this.ord;},
        };
    }

    class ListNode {
        /**
         * @param name
         * @param {ListNode} pv
         * @param {ListNode} nx
         */
        constructor(name = null, pv = this, nx = this) {
            this.name = name;
            this.pv = pv;
            this.nx = nx;
        }
        insert(newNode) {
            // insert newNode after this
            let a = this;
            let b = this.nx;
            a.nx = newNode;
            b.pv = newNode;
            newNode.pv = a;
            newNode.nx = b;
        }

        /**
         * swap to nodes
         * (NOTE: 'this' and 'that' must belong to different lists)
         * @param {ListNode} that
         */
        swapWithListNode(that) {
            const this_pv = this.pv, this_nx = this.nx;
            const that_pv = that.pv, that_nx = that.nx;
            this_pv.nx = this_nx.pv = that;
            that_pv.nx = that_nx.pv = this;
            this.pv = that_pv; this.nx = that_nx;
            that.pv = this_pv; that.nx = this_nx;
        }
    }

    class List {
        constructor(head = null) {
            this.head = head;
            this.size = (head ? 1 : 0);
        }

        /**
         * Insert new node at the end of the list
         * @param {ListNode} newNode
         */
        append(newNode) {
            if (! this.head) {
                this.head = newNode;
            } else {
                this.head.pv.insert(newNode);
            }
            this.size ++;
        }
        insertAfter(node, newNode) {
            node.insert(newNode);
            this.size ++;
        }
        remove(node) {
            this.size --;
            if (this.size === 0) {
                this.head = null;
            } else {
                node.pv.nx = node.nx;
                node.nx.pv = node.pv;
                if (this.head === node) {
                    this.head = node.nx;
                }
            }
        }
        print() {
            if (! this.head) {
                return '';
            }
            let ans = '';
            let node = this.head;
            do {
                ans += node.name.toString();
                ans += '\n';
                node = node.nx;
            } while(node !== this.head);
            return ans;
        }
        recalculateSize() {
            if (! this.head) {
                this.size = 0;
                return;
            }
            this.size = 1;
            for (let p = this.head.nx; p !== this.head; p = p.nx) {
                this.size ++;
            }
        }
        *[Symbol.iterator]() {
            for (let i = 0, p = this.head; i < this.size; p = p.nx, i++) {
                yield [p, i];
            }
        }
    }

    class Solid extends ListNode {
        /**
         * @param {?List} faces
         * @param {?List} edges
         * @param {?List} vertices
         * @param {?string} msgLabel
         */
        constructor(faces, edges, vertices, msgLabel) {
            super();
            initBrepElement(this, TreeNodeType.SOLID, nSolids ++, msgLabel);
            this.faces = faces ?? new List();
            this.edges = edges ?? new List();
            this.vertices = vertices ?? new List();
            globalSolids.set(this.ord, this);

            brepTreeViewSelector.jstree(true).create_node(treeNode_globalSolids, createTreeNode(this.type, this), 'last');
            brepTreeViewSelector.jstree(true).open_node(treeNode_globalSolids);
        }
        setSelectionState(newState) {
            if (this.isSelected !== newState) {
                this.isSelected = newState;
                for (let iter of this.faces) {
                    iter[0].setSelectionState(newState);
                }
                //renderManager.render();
            }
        }
    }

    class Face extends ListNode {
        /**
         * @param {!Solid} solid
         * @param {?Loop} outerLoop
         * @param {?List} innerLoops
         * @param {?string} msgLabel
         */
        constructor(solid, outerLoop, innerLoops, msgLabel) {
            super();
            initBrepElement(this, TreeNodeType.FACE, nFaces ++, msgLabel);
            this.solid = solid;
            solid.faces.append(this);
            this.outerLoop = outerLoop;
            this.innerLoops = innerLoops ?? new List();
            globalFaces.set(this.ord, this);

            this.treeNode_face = createTreeNode(this.type, this);
            brepTreeViewSelector.jstree(true).create_node(solid.id, this.treeNode_face, 'last');
            brepTreeViewSelector.jstree(true).open_node(solid.id);
            this.selectedCount = 0; // multiple selection on tree

            this.isDrawableOnPlane = false;
        }

        /*
         * Reference:
         * https://stackoverflow.com/questions/42393306/triangulation-of-3d-points-with-k-vertices-per-face
         */
        draw() {
            const msgLabel = "renderer";
            const failMsg = "Warning: Cannot draw Face #" + this.ord + ". ";
            if (! this.outerLoop || this.outerLoop.halfEdges.size <= 2) {
                this.isDrawableOnPlane = false;
                printMsg(msgLabel, failMsg + "Not enough points on the outer loop.");
                return;
            }

            const outer_hes = this.outerLoop.halfEdges;
            //const he1 = outer_hes.head, he2 = he1.nx;
            //const pt1 = he1.v1.pt, pt2 = he1.v2.pt, pt3 = he2.v2.pt;
            let he1;
            for (let iter of outer_hes) {
                if (! iter[0].v1.coincideWithVertex(iter[0].v2)) {
                    he1 = iter[0]; break;
                }
            }
            if (! he1) {
                this.isDrawableOnPlane = false;
                printMsg(msgLabel, failMsg + "All points on the outer loop coincide.");
                return;
            }
            const pt1 = he1.v1.pt, pt2 = he1.v2.pt;

            let he2;
            for (let iter of outer_hes) {
                const he = iter[0];
                if (he !== he1 && he !== he1.pv && ! he.v2.isOnLine(he1)) {
                    he2 = he; break;
                }
            }
            if (! he2) {
                this.isDrawableOnPlane = false;
                printMsg(msgLabel, failMsg + "All points on the outer loop are collinear.");
                return;
            }
            const pt3 = he2.v2.pt;

            // calculate normal vector of plane
            // Reference: https://www.khronos.org/opengl/wiki/Calculating_a_Surface_Normal
            let [normal_x, normal_y, normal_z] = [0, 0, 0];
            for (const [he] of outer_hes) {
                const p = he.v1.pt;
                const q = he.v2.pt;
                normal_x += (p.y - q.y) * (p.z + q.z);
                normal_y += (p.z - q.z) * (p.x + q.x);
                normal_z += (p.x - q.x) * (p.y + q.y);
                // normal[0] += (p[1] - q[1]) * (p[2] + q[2]);
                // normal[1] += (p[2] - q[2]) * (p[0] + q[0]);
                // normal[2] += (p[0] - q[0]) * (p[1] + q[1]);
            }
            const normal = new THREE.Vector3(normal_x, normal_y, normal_z).normalize();

            const plane = new THREE.Plane();
            //plane.setFromCoplanarPoints(pt1, pt2, pt3);
            plane.setFromNormalAndCoplanarPoint(normal, pt1);

            if (! this.outerLoop.isOnPlane(plane)) {
                this.isDrawableOnPlane = false;
                printMsg(msgLabel, failMsg + "Points on the outer loop are not coplanar.");
                return;
            }
            for (let iter of this.innerLoops) {
                if (! iter[0].isOnPlane(plane)) {
                    this.isDrawableOnPlane = false;
                    printMsg(msgLabel, failMsg + "Inner loop #" + iter[0].ord
                        + " is not coplanar with the outer loop.");
                    return;
                }
            }

            this.isDrawableOnPlane = true;
            this.plane = plane;
            // this.planeHelper = new THREE.PlaneHelper( this.plane, 1, 0xffff00 );
            // scene.add(this.planeHelper);

            const X = new THREE.Vector3(1, 0, 0);
            const Y = new THREE.Vector3(0, 1, 0);
            const Z = new THREE.Vector3(0, 0, 1);
            const z = new THREE.Vector3(0, 0, 0); z.sub(this.plane.normal);
            const q = new THREE.Quaternion(); q.setFromUnitVectors(Z, z);
            const x = new THREE.Vector3(); x.copy(X); x.applyQuaternion(q);
            const y = new THREE.Vector3(); y.crossVectors(x, z); y.normalize();
            const basis = new THREE.Matrix4();
            basis.makeBasis(x, y, z);
            basis.setPosition(pt1);

            this.plane_origin = pt1.clone();
            this.plane_basis_x = x;
            this.plane_basis_y = y;
            this.plane_basis_z = z;
            this.plane_basis_mat = basis;

            const projectedPts = [];
            for (let iter of outer_hes) {
                projectedPts.push(iter[0].v1.getProjection_Oxy(pt1, x, y));
            }
            this.shape = new THREE.Shape(projectedPts);

            //const projectedHoles = [];
            for (let iter_loop of this.innerLoops) {
                const loop = iter_loop[0];
                const hole = [];
                for (let iter of loop.halfEdges) {
                    hole.push(iter[0].v1.getProjection_Oxy(pt1, x, y));
                }
                //projectedHoles.push(hole);
                if (hole.length > 0) {
                    const holeShape = new THREE.Shape(hole);
                    this.shape.holes.push(holeShape);
                }
            }

            this.geometry = new THREE.ShapeBufferGeometry(this.shape);
            this.geometry.applyMatrix(basis);
            if (this.mesh) {
                scene.remove(this.mesh);
            }
            this.mesh = new THREE.Mesh(this.geometry, faceMaterialPlain);
            scene.add(this.mesh);
            renderManager.render();
        }

        setSelectionState(newState) {
            this.selectedCount += (newState ? 1 : -1);
            newState = (this.selectedCount > 0);
            if (this.isSelected !== newState) {
                this.isSelected = newState;
                scene.remove(this.mesh);
                this.mesh = new THREE.Mesh(this.geometry,
                    newState ? faceMaterialSelected : faceMaterialPlain);
                scene.add(this.mesh);
                renderManager.render();
            }
        }

        destroy() {
            //this.outerLoop.removeTreeViewNodes_all();
            //for (const [loop] of this.innerLoops) loop.removeTreeViewNodes_all();
            this.outerLoop.removeTreeViewNodes();
            for (const [loop] of this.innerLoops) loop.removeTreeViewNodes();

            // NOTE: jstree seems to be buggy in removing nodes,
            //       so I have to retain this node...
            brepTreeViewSelector.jstree(true)
                .rename_node(this.treeNode_face.id, "(REMOVED) " + this.id);
            brepTreeViewSelector.jstree(true).close_node(this.treeNode_face);
            //removeTreeNode(this.treeNode_face.id);
            this.treeNode_face = undefined;

            this.solid.faces.remove(this);
            scene.remove(this.mesh);
            globalFaces.delete(this.ord);
        }
    }

    class Loop extends ListNode {
        /**
         * @param {!Face} face
         * @param {!boolean} isOuterLoop
         * @param {?List} halfEdges
         * @param {?string} msgLabel
         */
        constructor(face, isOuterLoop = true, halfEdges, msgLabel) {
            super();
            initBrepElement(this,
                isOuterLoop ? TreeNodeType.LOOP_OUTER : TreeNodeType.LOOP_INNER,
                nLoops ++, msgLabel);
            this.face = face;
            if (isOuterLoop) {
                face.outerLoop = this;
            } else {
                face.innerLoops.append(this);
            }
            this.halfEdges = halfEdges ?? new List();
            globalLoops.set(this.ord, this);

            this.treeNode_loop = createTreeNode(this.type, this);
            brepTreeViewSelector.jstree(true).create_node(face.id, this.treeNode_loop, 'last');
            brepTreeViewSelector.jstree(true).open_node(face.id);

            //this.partner_loop_for_sweep = null; // only valid if this is an inner loop
        }

        changeLoopType(new_isOuterLoop) {
            brepElementChangeType(this, new_isOuterLoop ? TreeNodeType.LOOP_OUTER : TreeNodeType.LOOP_INNER);
        }

        /**
         * @param {!Vertex} vertex
         * @returns {[?HalfEdge, !number]}
         */
        findVertex(vertex) {
            //for (let he = this.halfEdges.head, i = 0; i < this.halfEdges.size; he = he.nx, ++i) {
            for (let iter of this.halfEdges) { // iter = [he, i]
                if (iter[0].v2 === vertex) {
                    // he.insert(he1_new);
                    // he1_new.insert(he2_new);
                    return iter;
                }
            }
            return [null, 0];
        }

        /**
         * @param {THREE.Plane} plane
         */
        isOnPlane(plane) {
            for (let iter of this.halfEdges) {
                //const dist = Math.abs(plane.distanceToPoint(iter[0].v1.pt));
                //if (dist > geoEpsilon) return false;
                if (! iter[0].v1.isOnPlane(plane)) {
                    return false;
                }
            }
            return true;
        }

        /**
         * @param {Array.<!HalfEdge>} he_arr
         * @param {THREE.Vector3} origin    (the origin of the plane to project onto)
         * @param {THREE.Vector3} x         (the x axis of the plane to project onto)
         * @param {THREE.Vector3} y         (the y axis of the plane to project onto)
         * @returns {boolean}
         */
        static isClockwise(he_arr, origin, x, y) {
            const vs = [];
            for (const he of he_arr) {
                vs.push(he.v1.getProjection_Oxy(origin, x, y));
            }
            // Reference: https://stackoverflow.com/questions/14505565/detect-if-a-set-of-points-in-an-array-that-are-the-vertices-of-a-complex-polygon
            let area = 0;
            for (let i = 0; i < vs.length; i++) {
                const j = (i + 1) % vs.length;
                area += vs[i].x * vs[j].y - vs[j].x * vs[i].y;
            }
            return area < 0;
        }
        isClockwise(origin, x, y) {
            const he_arr = [];
            for (const [he] of this.halfEdges) he_arr.push(he);
            return Loop.isClockwise(he_arr, origin, x, y);
        }

        /**
         * Check if this loop coincides with a sub-loop (with opposite orientation) of "loop_outer".
         * @param {!Loop} loop_outer
         * @returns {boolean}
         */
        coincidesWithSubloopOf(loop_outer) {
            for (const iter of this.halfEdges) {
                const he_inner = iter[0];
                const he_outer = he_inner.getPartner();
                if (he_outer.loop !== loop_outer) {
                    return false;
                }
            }
            // for (const iter of this.halfEdges) {
            //     const he_inner = iter[0];
            //     if (! he_inner.v1.isInPolygon(old_face)) {
            //         return false;
            //     }
            // }
            return true;
        }

        /**
         * Check the orientations of "this" and "loop_outer",
         * provided that this loop coincides with a sub-loop (with opposite orientation) of "loop_outer".
         * @param {!Loop} loop_outer
         */
        fixOrientation(loop_outer) {
            const msgLabel = "geometry";
            if (! this.face.plane && ! loop_outer.face.plane) {
                printMsg(msgLabel, "Failed to fix orientations of Loop #" + this.ord +
                    " and Loop #" + loop_outer.ord + ", because they cannot be rendered on a plane.");
                return;
            }
            const old_face = this.face.plane ? this.face : loop_outer.face;

            // find the halfedges of loop_outer that do NOT coincide with this loop
            const enclosing_he_arr = [];
            for (const [he] of loop_outer.halfEdges) {
                if (he.getPartner().loop !== this) {
                    enclosing_he_arr.push(he);
                }
            }

            // find the entrance to the sub-loop of outer loop that coincides with this (inner) loop
            let outer_he_entrance = this.halfEdges.head.getPartner();
            do {
                outer_he_entrance = outer_he_entrance.pv;
            } while(outer_he_entrance.getPartner().loop === this);

            const inner_he_arr_reversed = [];
            const outer_he_arr = [];
            for (let he = outer_he_entrance.nx, i = 0; i < this.halfEdges.size; he = he.nx, ++i) {
                outer_he_arr.push(he);
                inner_he_arr_reversed.push(he.getPartner());
            }
            const inner_he_arr = inner_he_arr_reversed.slice().reverse();
            // for (const iter of this.halfEdges) {
            //     inner_he_arr.push(iter[0]);
            //     outer_he_arr.push(iter[0].getPartner());
            // }

            const plane_origin = old_face.plane_origin;
            const plane_x = old_face.plane_basis_x;
            const plane_y = old_face.plane_basis_y;
            const outer_orient = Loop.isClockwise(enclosing_he_arr, plane_origin, plane_x, plane_y);
            const inner_orient = Loop.isClockwise(inner_he_arr, plane_origin, plane_x, plane_y);

            if (inner_orient === outer_orient) {
                printMsg(msgLabel, "No need to re-orientate Loop #" + this.ord +
                    " and sub-loop of Loop #" + loop_outer.ord);
            } else {
                printMsg(msgLabel, "Orientation of Loop #" + this.ord + " has been flipped");
                printMsg(msgLabel, "Orientation of sub-loop of Loop #" + loop_outer.ord + " has been flipped");
                for (let i = 0; i < inner_he_arr.length; ++i) {
                    const he1 = outer_he_arr[i];
                    const he2 = inner_he_arr[i];
                    he1.swapWithListNode(he2);
                    [he1.loop, he2.loop] = [he2.loop, he1.loop];
                }
                this.halfEdges.head = outer_he_arr[0];
                loop_outer.halfEdges.head = inner_he_arr[0];
            }
        }

        removeTreeViewNodes_all() {
            this.removeTreeViewNodes();
            if (this.treeNode_loop) removeTreeNode(this.treeNode_loop.id);
            this.treeNode_loop = undefined;
        }
        createTreeViewNodes_all() {
            this.treeNode_loop = createTreeNode(this.type, this);
            brepTreeViewSelector.jstree(true).create_node(this.face.id, this.treeNode_loop, 'last');
            brepTreeViewSelector.jstree(true).open_node(this.face.id);
            this.createTreeViewNodes();
        }
        removeTreeViewNodes() {
            for (let iter of this.halfEdges) iter[0].removeTreeViewNodes();
        }
        createTreeViewNodes() {
            for (let iter of this.halfEdges) iter[0].createTreeViewNodes();
        }
        setSelectionState(newState) {
            if (this.isSelected !== newState) {
                this.isSelected = newState;
                for (let iter of this.halfEdges) {
                    iter[0].setSelectionState(newState);
                }
                //renderManager.render();
            }
        }
    }

    class HalfEdge extends ListNode {
        /**
         * @param {!Loop} loop
         * @param {!number} pos
         * @param {!Vertex} v1
         * @param {!Vertex} v2
         * @param {?Edge} e
         * @param {?string} msgLabel
         */
        constructor(loop, pos, v1, v2, e, msgLabel) { // v1 -> v2
            super();
            initBrepElement(this, TreeNodeType.HALF_EDGE, nHalfEdges ++, msgLabel);
            this.loop = loop;
            //loop.halfEdges.append(this);
            this.e = e;
            this.v1 = v1;
            this.v2 = v2;
            globalHalfEdges.set(this.ord, this);

            this.createTreeViewNodes(pos);
            this.selectedCount = 0; // multiple selection on tree

            this.drawArrow();
        }
        getPartner() {
            return this === this.e.he1 ? this.e.he2 : this.e.he1;
        }
        drawArrow() {
            if (this.isSelected) {
                scene.remove(this.arrowHelper);
            }
            this.arrowVec = this.v2.pt.clone();
            this.arrowVec.sub(this.v1.pt);
            this.arrowDir = this.arrowVec.clone();
            this.arrowDir.normalize();
            this.arrowOrigin = this.v1.pt.clone();
            this.arrowLength = this.arrowVec.length();
            this.arrowHelper = new THREE.ArrowHelper(
                this.arrowDir, this.arrowOrigin, this.arrowLength, arrowHeadColorHex );
            if (this.isSelected) {
                scene.add(this.arrowHelper);
            }
        }
        setSelectionState(newState) {
            this.selectedCount += (newState ? 1 : -1);
            newState = (this.selectedCount > 0);
            if (this.isSelected !== newState) {
                this.isSelected = newState;
                this.v1.setSelectionState(newState);
                this.v2.setSelectionState(newState);
                if (newState) {
                    scene.add(this.arrowHelper);
                } else {
                    scene.remove(this.arrowHelper);
                }
                renderManager.render();
            }
        }
        removeTreeViewNodes() {
            if (this.treeNode_he) removeTreeNode(this.treeNode_he.id);
            if (this.treeNode_v1) removeTreeNode(this.treeNode_v1.id);
            if (this.treeNode_v2) removeTreeNode(this.treeNode_v2.id);
            this.treeNode_he = undefined;
            this.treeNode_v1 = undefined;
            this.treeNode_v2 = undefined;
        }
        createTreeViewNodes(pos = 'last') {
            this.treeNode_he = createTreeNode(this.type, this);
            this.treeNode_v1 = createTreeNode(TreeNodeType.VERTEX_1_OF_HE, this.v1, this.ord);
            this.treeNode_v2 = createTreeNode(TreeNodeType.VERTEX_2_OF_HE, this.v2, this.ord);
            brepTreeViewSelector.jstree(true).create_node(this.loop.id, this.treeNode_he, pos);
            brepTreeViewSelector.jstree(true).open_node(this.loop.id);
            brepTreeViewSelector.jstree(true).create_node(this.id, this.treeNode_v1, 'last');
            brepTreeViewSelector.jstree(true).create_node(this.id, this.treeNode_v2, 'last');
        }
        destroy() {
            this.removeTreeViewNodes();
            globalHalfEdges.delete(this.ord);
        }

        /**
         * @param {!Vertex} v_mid
         * @param {!boolean} retainFirstHalf
         * @param {!Edge} newEdge
         * @param {?string} msgLabel
         */
        split(v_mid, retainFirstHalf, newEdge, msgLabel) {
            retainFirstHalf = true;

            const v1 = this.v1;
            const v2 = v_mid;
            const v3 = this.v2;
            const loop = this.loop;

            this.removeTreeViewNodes();
            if (retainFirstHalf) {
                this.v2 = v_mid;
            } else {
                this.v1 = v_mid;
            }
            this.createTreeViewNodes();
            this.drawArrow();

            let he_new;
            let [he_new_pos, he_new_pos_num] = loop.findVertex(v2);
            if (retainFirstHalf) {
                he_new = new HalfEdge(loop, he_new_pos_num, v2, v3, newEdge, msgLabel);
                loop.halfEdges.insertAfter(this, he_new);
            } else {
                he_new_pos_num -= 1;
                if (he_new_pos_num < 0) he_new_pos_num = 'last';
                he_new = new HalfEdge(loop, he_new_pos_num, v1, v2, newEdge, msgLabel);
                loop.halfEdges.insertAfter(this.pv, he_new);
            }

            return [this, he_new];
        }
    }

    class Edge extends ListNode {
        /**
         * @param {!Solid} solid
         * @param {?HalfEdge} he1
         * @param {?HalfEdge} he2
         * @param {?string} msgLabel
         * this.line: the line segment drawn on three.js scene
         */
        constructor(solid, he1, he2, msgLabel) {
            super();
            initBrepElement(this, TreeNodeType.EDGE_GLOBAL, nEdges ++, msgLabel);
            this.solid = solid;
            solid.edges.append(this);
            this.he1 = he1;
            this.he2 = he2;
            globalEdges.set(this.ord, this);

            this.createTreeViewNodes();
        }
        draw() {
            if (this.lineMesh) {
                scene.remove(this.lineMesh);
            }
            this.pts = [this.he1.v1.pt, this.he1.v2.pt];
            //this.lineGeometry = new THREE.BufferGeometry().setFromPoints( this.pts );
            //this.line = new THREE.Line( this.lineGeometry, lineMaterialPlain );
            this.line = new MeshLine(this.lineGeometry);
            this.line.setPoints(this.pts);
            this.lineMesh = new THREE.Mesh(this.line, lineMeshMaterialPlain);
            scene.add(this.lineMesh);
            renderManager.render();
        }
        setSelectionState(newState) {
            if (this.isSelected !== newState) {
                this.isSelected = newState;
                scene.remove(this.lineMesh);
                // this.line = new THREE.Line( this.lineGeometry,
                //     newState ? lineMaterialSelected : lineMaterialPlain);
                this.lineMesh = new THREE.Mesh(this.line,
                    newState ? lineMeshMaterialSelected : lineMeshMaterialPlain);
                scene.add(this.lineMesh);
                renderManager.render();
            }
        }
        createTreeViewNodes() {
            this.treeNode_globalEdge = createTreeNode(this.type, this);
            brepTreeViewSelector.jstree(true).create_node(treeNode_globalEdges, this.treeNode_globalEdge, 'last');
            brepTreeViewSelector.jstree(true).open_node(treeNode_globalEdges);
        }
        removeTreeViewNodes() {
            removeTreeNode(this.treeNode_globalEdge.id);
            this.treeNode_globalEdge = undefined;
        }
        destroy() {
            this.he1.destroy();
            this.he2.destroy();
            globalEdges.delete(this.ord);
            this.removeTreeViewNodes();
            scene.remove(this.lineMesh);
            renderManager.render();
        }
    }

    class Vertex extends ListNode {
        /**
         * @param {!Solid} solid
         * @param {!THREE.Vector3} pt
         * @param {?string} msgLabel
         * this.dot: the little circle drawn on three.js scene
         */
        constructor(solid, pt, msgLabel) {
            super();
            initBrepElement(this, TreeNodeType.VERTEX_GLOBAL, nVertices ++, msgLabel);
            this.solid = solid;
            solid.vertices.append(this);
            this.pt = pt;
            globalVertices.set(this.ord, this);

            brepTreeViewSelector.jstree(true).create_node(treeNode_globalVertices,
                createTreeNode(TreeNodeType.VERTEX_GLOBAL, this), 'last');
            brepTreeViewSelector.jstree(true).open_node(treeNode_globalVertices);
            this.selectedCount = 0; // multiple selection on tree

            this.dotGeometry = new THREE.Geometry();
            this.dotGeometry.vertices.push(pt);
            this.dot = new THREE.Points(this.dotGeometry, dotMaterialPlain);
            scene.add(this.dot);
            renderManager.render();
        }

        /**
         * @param {!THREE.Vector3} origin
         * @param {!THREE.Vector3} x
         * @param {!THREE.Vector3} y
         * @returns {!THREE.Vector2}
         */
        getProjection_Oxy(origin, x, y) {
            const t = new THREE.Vector3();
            t.subVectors(this.pt, origin);
            return new THREE.Vector2(t.dot(x), t.dot(y));
        }

        /**
         * @param {Vertex} v
         * @returns {boolean}
         */
        coincideWithVertex(v) {
            return this.pt.clone().sub(v.pt).length() < geoEpsilon;
        }

        /**
         * @param {HalfEdge} he
         * @returns {boolean}
         */
        isOnLine(he) {
            const pt1 = he.v1.pt, pt2 = he.v2.pt, pt3 = this.pt;
            return new THREE.Triangle(pt1, pt2, pt3).getArea() < geoEpsilon;
        }

        /**
         * @param {THREE.Plane} plane
         */
        isOnPlane(plane) {
            const dist = Math.abs(plane.distanceToPoint(this.pt));
            return dist <= geoEpsilon;
        }

        /**
         * @param {!Loop} loop
         * @param {!Face} proj_face
         * @param {boolean} allowProjection
         * @returns {boolean}
         */
        isInLoop(loop, proj_face, allowProjection) {
            if (! allowProjection && ! this.isOnPlane(proj_face.plane)) {
                return false;
            }
            const po = proj_face.plane_origin;
            const px = proj_face.plane_basis_x;
            const py = proj_face.plane_basis_y;
            const p = this.getProjection_Oxy(po, px, py);

            // reference: https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
            // ray-casting algorithm based on
            // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
            let inside = false;
            const x = p.x, y = p.y;
            for(const [he] of loop.halfEdges) {
                const v1_proj = he.v1.getProjection_Oxy(po, px, py);
                const v2_proj = he.v2.getProjection_Oxy(po, px, py);
                const xi = v2_proj.x, yi = v2_proj.y;
                const xj = v1_proj.x, yj = v1_proj.y;
                const intersect = ((yi > y) !== (yj > y))
                        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
            }
            return inside;

            // var x = point[0], y = point[1];
            //
            // var inside = false;
            // for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            //     var xi = vs[i][0], yi = vs[i][1];
            //     var xj = vs[j][0], yj = vs[j][1];
            //
            //     var intersect = ((yi > y) != (yj > y))
            //         && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            //     if (intersect) inside = !inside;
            // }
            //
            // return inside;
        }

        setSelectionState(newState) {
            this.selectedCount += (newState ? 1 : -1);
            newState = (this.selectedCount > 0);
            if (this.isSelected !== newState) {
                this.isSelected = newState;
                scene.remove(this.dot);
                this.dot = new THREE.Points(this.dotGeometry,
                    newState ? dotMaterialSelected : dotMaterialPlain);
                scene.add(this.dot);
                renderManager.render();
            }
        }
    }

    /**
     * Add text to the message box
     * @param {string} label
     * @param {string} msg
     */
    function printMsg(label="", msg="") {
        if (label) {
            msg = "[" + label + "] " + msg;
        }
        const content = document.createTextNode(msg + "\n");
        msgBox.appendChild(content);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    /**
     * @param {string} nodeName
     * @param {boolean} newState (true: the node gets selected)
     */
    function brepTreeNodeSelectionChanged(nodeName, newState) {
        if (! treeViewNodes.has(nodeName)) {
            return;
        }
        const node = treeViewNodes.get(nodeName);
        const nodeId = node.data;
        const type = nodeId.type;
        const ord = nodeId.ord;
        switch(type) {
            case TreeNodeType.SOLID:
                const solid = globalSolids.get(ord);
                if (!solid) return;
                solid.setSelectionState(newState);
                break;
            case TreeNodeType.FACE:
                const face = globalFaces.get(ord);
                if (!face) return;
                face.setSelectionState(newState);
                break;
            case TreeNodeType.HALF_EDGE:
                const halfEdge = globalHalfEdges.get(ord);
                if (!halfEdge) return;
                halfEdge.setSelectionState(newState);
                break;
            case TreeNodeType.EDGE_GLOBAL:
                const edge = globalEdges.get(ord);
                if (!edge) return;
                edge.setSelectionState(newState);
                break;
            case TreeNodeType.LOOP_INNER:
            case TreeNodeType.LOOP_OUTER:
                const loop = globalLoops.get(ord);
                if (!loop) return;
                loop.setSelectionState(newState);
                break;
            case TreeNodeType.VERTEX_1_OF_HE:
            case TreeNodeType.VERTEX_2_OF_HE:
            case TreeNodeType.VERTEX_GLOBAL:
                const v = globalVertices.get(ord);
                if (!v) return;
                v.setSelectionState(newState);
                break;
            default:
                break;
        }
    }
    brepTreeViewSelector.on("changed.jstree", (e, data) => {
        //console.log(data.changed.selected); // newly selected
        //console.log(data.changed.deselected); // newly deselected
        for(const nodeName of data.changed.selected) {
            brepTreeNodeSelectionChanged(nodeName, true);
        }
        for(const nodeName of data.changed.deselected) {
            brepTreeNodeSelectionChanged(nodeName, false);
        }
    });

    /**
     * @param brep
     * @param {Loop} loop
     * @param {THREE.Vector3} move_vec
     */
    function sweep_single_loop(brep, loop, move_vec) {
        const base_v_arr = [];
        for (const [he] of loop.halfEdges) {
            base_v_arr.push(he.v1);
        }

        const top_v_arr = [];
        for (const v of base_v_arr) {
            const pt = v.pt.clone();
            pt.add(move_vec);
            const [e_new, v_new] = brep.mev(v.ord, loop.ord, pt);
            top_v_arr.push(v_new);
        }

        for (let i = 0, j = 1; i < base_v_arr.length; ++i, ++j) {
            if (i === base_v_arr.length - 1) j = 0;
            brep.mef(top_v_arr[i].ord, top_v_arr[j].ord, loop.ord);
        }
    }

    ////////////////////////////////////////////////////////////

    // public
    return {
        /**
         * Make a Vertex, a Face, and a Solid
         * @param {THREE.Vector3} pt    Coordinates of the new Vertex
         * @return {Solid}              The new Solid
         */
        mvfs: function(pt) {
            const msgLabel = "mvfs";
            printMsg("", msgLabel + " " + pt.x + " " + pt.y + " " + pt.z);

            const solid = new Solid(null, null, null, msgLabel);
            const face = new Face(solid, null, null, msgLabel);
            //solid.faces.append(face);
            const loop = new Loop(face, true, null, msgLabel);
            //face.outerLoop = loop;
            const vertex = new Vertex(solid, pt, msgLabel);
            //solid.vertices.append(vertex);

            face.draw();
            buttonManager.enableButton("btnMev");
            buttonManager.enableButton("btnMef");
            buttonManager.enableButton("btnSweep");
            printMsg("");
            return solid;
        },

        /**
         * Make an Edge connecting a new Vertex
         * and an existing Vertex
         * @param {number} v_ord
         * @param {number} lp_ord
         * @param {THREE.Vector3} pt_new
         * @returns {[Edge, Vertex]}
         */
        mev: function(v_ord, lp_ord, pt_new) {
            const msgLabel = "mev";
            printMsg("", msgLabel + " " + v_ord + " " + lp_ord + " "
                + pt_new.x + " " + pt_new.y + " " + pt_new.z);

            if (! globalVertices.has(v_ord)) {
                printMsg(msgLabel, "Error: Vertex #" + v_ord + " does not exist.\n");
                return null;
            }
            const vertex_old = globalVertices.get(v_ord);

            if (! globalLoops.has(lp_ord)) {
                printMsg(msgLabel, "Error: Loop #" + lp_ord + " does not exist.\n");
                return null;
            }
            const loop = globalLoops.get(lp_ord);

            // find the position to insert the two new half edges
            const [he_insert_pos, he_insert_pos_num] = loop.findVertex(vertex_old);
            //alert(he_insert_pos_num);
            if (loop.halfEdges.size > 0 && ! he_insert_pos) {
                printMsg(msgLabel, "Error: Vertex #" + v_ord
                    + " is not inside Loop #" + lp_ord + "\n");
                return null;
            }

            const solid = loop.face.solid;
            const vertex_new = new Vertex(solid, pt_new, msgLabel);
            const edge_new = new Edge(solid, null, null, msgLabel);
            const he1_new = new HalfEdge(loop, he_insert_pos_num+1, vertex_old, vertex_new, edge_new, msgLabel);
            const he2_new = new HalfEdge(loop, he_insert_pos_num+2, vertex_new, vertex_old, edge_new, msgLabel);
            edge_new.he1 = he1_new;
            edge_new.he2 = he2_new;
            edge_new.draw();

            if (loop.halfEdges.size > 0) {
                loop.halfEdges.insertAfter(he_insert_pos, he1_new);
                loop.halfEdges.insertAfter(he1_new, he2_new);
                //he_insert_pos.insert(he1_new);
                //he1_new.insert(he2_new);
            } else {
                loop.halfEdges.append(he1_new);
                loop.halfEdges.append(he2_new);
            }

            loop.face.draw();
            buttonManager.enableButton("btnKemr");
            buttonManager.enableButton("btnSemv");
            printMsg("");
            return [edge_new, vertex_new];
        },

        /**
         * Make an Edge and a Face
         * @param {!number} v1_ord
         * @param {!number} v2_ord
         * @param {!number} lp_ord
         */
        mef: function(v1_ord, v2_ord, lp_ord) {
            const msgLabel = "mef";
            printMsg("", msgLabel + " " + v1_ord + " " + v2_ord + " " + lp_ord);

            if (! globalVertices.has(v1_ord)) {
                printMsg(msgLabel, "Error: Vertex #" + v1_ord + " does not exist.\n");
                return null;
            }
            const v1 = globalVertices.get(v1_ord);

            if (! globalVertices.has(v2_ord)) {
                printMsg(msgLabel, "Error: Vertex #" + v2_ord + " does not exist.\n");
                return null;
            }
            const v2 = globalVertices.get(v2_ord);

            if (! globalLoops.has(lp_ord)) {
                printMsg(msgLabel, "Error: Loop #" + lp_ord + " does not exist.\n");
                return null;
            }
            const loop = globalLoops.get(lp_ord);
            // if (loop.type !== TreeNodeType.LOOP_OUTER) {
            //     printMsg(msgLabel, "Error: Loop #" + lp_ord + " is not an outer loop.\n");
            //     return null;
            // }

            const [he_pos_1, he_pos_1_num] = loop.findVertex(v1);
            if (! he_pos_1) {
                printMsg(msgLabel, "Error: Vertex #" + v1_ord
                    + " is not inside Loop #" + lp_ord + "\n");
                return null;
            }

            const [he_pos_2, he_pos_2_num] = loop.findVertex(v2);
            if (! he_pos_2) {
                printMsg(msgLabel, "Error: Vertex #" + v2_ord
                    + " is not inside Loop #" + lp_ord + "\n");
                return null;
            }

            const solid = loop.face.solid;
            const edge_new = new Edge(solid, null, null, msgLabel);
            const he1_new = new HalfEdge(loop, he_pos_1 + 1, v1, v2, edge_new, msgLabel);
            const he2_new = new HalfEdge(loop, he_pos_2 + 1, v2, v1, edge_new, msgLabel);
            edge_new.he1 = he1_new;
            edge_new.he2 = he2_new;
            edge_new.draw();

            loop.removeTreeViewNodes();
            const he_pos_1_nx = he_pos_1.nx;
            const he_pos_2_nx = he_pos_2.nx;
            he_pos_1.nx = he1_new;      he1_new.pv = he_pos_1;
            he1_new.nx = he_pos_2_nx;   he_pos_2_nx.pv = he1_new;
            he_pos_2.nx = he2_new;      he2_new.pv = he_pos_2;
            he2_new.nx = he_pos_1_nx;   he_pos_1_nx.pv = he2_new;

            const face_new = new Face(solid, null, null, msgLabel);
            const loop_new = new Loop(face_new, true, null, msgLabel);
            face_new.outerLoop = loop_new;
            loop.halfEdges.head = he1_new;
            loop.halfEdges.recalculateSize();
            loop_new.halfEdges.head = he2_new;
            loop_new.halfEdges.recalculateSize();
            for (let iter of loop_new.halfEdges) iter[0].loop = loop_new;

            if (loop.type === TreeNodeType.LOOP_OUTER) {
                // outer -> outer + outer
                const loop_new_in_old = loop_new.coincidesWithSubloopOf(loop);
                const loop_old_in_new = loop.coincidesWithSubloopOf(loop_new);
                let [loop_outer, loop_inner] = [null, null];
                if (loop_new_in_old && loop_old_in_new) {
                    printMsg("geometry", "The new loop (Loop #" + loop_new.ord + ")"
                        + " coincides with the old loop (Loop #" + loop.ord + ")");
                } else if (loop_new_in_old) {
                    [loop_outer, loop_inner] = [loop, loop_new];
                } else if (loop_old_in_new) {
                    [loop_outer, loop_inner] = [loop_new, loop];
                }
                if (loop_outer) {
                    printMsg("geometry", "Loop #" + loop_inner.ord +
                        " coincides with a sub-loop of Loop #" + loop_new.ord);
                    loop_inner.fixOrientation(loop_outer);
                }
            } else {
                // inner -> inner + outer
                const loop_outer = loop.face.outerLoop;
                const fo = loop.face.plane_origin;
                const fx = loop.face.plane_basis_x;
                const fy = loop.face.plane_basis_y;
                const orient_outer = loop_outer.isClockwise(fo, fx, fy);
                const orient_inner = loop.isClockwise(fo, fx, fy);
                if (orient_outer !== orient_inner) {
                    printMsg("geometry", "The orientations of Loop #" + loop.ord +
                        " and its outer loop (Loop #" + loop_outer.ord + ")" +
                        " are different. OK.");
                } else {
                    printMsg("geometry", "The orientations of Loop #" + loop.ord +
                        " and its outer loop (Loop #" + loop_outer.ord + ")" +
                        " are the same, need to flip.");
                    printMsg("geometry", "The contents of Loop #" + loop.ord +
                        " and Loop #" + loop_new.ord + " have been interchanged.");
                    [loop.halfEdges.head, loop_new.halfEdges.head] = [loop_new.halfEdges.head, loop.halfEdges.head];
                    [loop.halfEdges.size, loop_new.halfEdges.size] = [loop_new.halfEdges.size, loop.halfEdges.size];
                    for (const [he] of loop.halfEdges) he.loop = loop;
                    for (const [he] of loop_new.halfEdges) he.loop = loop_new;
                }
                //loop.partner_loop_for_sweep = face_new.outerLoop;
            }

            loop.createTreeViewNodes();
            loop_new.createTreeViewNodes();
            loop.face.draw();
            loop_new.face.draw();

            printMsg("");
            buttonManager.enableButton("btnKemr");
            buttonManager.enableButton("btnKfmrh");
            return [edge_new, face_new];
        },

        /**
         * @param {number} e_ord
         * @returns {Loop}
         */
        kemr: function(e_ord) {
            const msgLabel = "kemr";
            printMsg("", msgLabel + " " + e_ord);

            if (! globalEdges.has(e_ord)) {
                printMsg(msgLabel, "Error: Edge #" + e_ord + " does not exist.\n");
                return null;
            }
            const edge = globalEdges.get(e_ord);
            let he1 = edge.he1;
            let he2 = edge.he2;

            if (he1.loop !== he2.loop) {
                printMsg(msgLabel, "Error: The two half-edges of Edge #" + e_ord
                    + " are not in the same loop.\n");
                return null;
            }

            if (he1.nx === he2 && he2.nx === he1) {
                printMsg(msgLabel, "Error: Killing Edge #" + e_ord
                    + " would result in two degenerative loops, each having just one vertex.\n");
                return null;
            }

            const loop_old = edge.he1.loop;
            const face = loop_old.face;
            let loop_new;

            if (he2.nx === he1) [he1, he2] = [he2, he1];
            if (he1.nx === he2) {
                const v = he1.v2;
                printMsg(msgLabel, "Producing a degenerative loop having just one vertex: " +
                    "Vertex #" + v.ord);
                if (! v.isInLoop(loop_old, face, true)) {
                    printMsg("geometry", "Error: Vertex #" + v.ord +
                        " is not inside the outer Loop #" + loop_old.ord);
                    return null;
                }
                printMsg("geometry", "OK, Vertex #" + v.ord +
                    " is inside the outer Loop #" + loop_old.ord);
                // printMsg("geometry", "WARNING: Please make sure by yourself that the inner loop"
                //     + " will have the correct orientation relative to the outer loop.");

                loop_old.removeTreeViewNodes();

                he1.pv.nx = he2.nx;
                he2.nx.pv = he1.pv;

                loop_old.halfEdges.head = he2.nx;
                loop_old.halfEdges.recalculateSize();
                loop_old.createTreeViewNodes();
                loop_new = new Loop(face, false, null, msgLabel);
            } else {
                loop_old.removeTreeViewNodes();

                he1.nx.pv = he2.pv;
                he1.pv.nx = he2.nx;
                he2.nx.pv = he1.pv;
                he2.pv.nx = he1.nx;

                loop_old.halfEdges.head = he1.nx;
                loop_old.halfEdges.recalculateSize();
                const v = he1.pv.v2;
                if (v.isInLoop(loop_old, face, true)) {
                    printMsg("geometry", "Assuming HalfEdge #" + loop_old.halfEdges.head.ord
                        + " is part of the outer loop, since Vertex #" + v.ord
                        + " lies within that loop");
                    loop_new = new Loop(face, false, null, msgLabel);
                    loop_old.halfEdges.head = he1.nx;
                    loop_new.halfEdges.head = he2.nx;
                } else {
                    printMsg("geometry", "Assuming HalfEdge #" + loop_old.halfEdges.head.ord
                        + " is part of the inner loop, since Vertex #" + v.ord
                        + " lies outside of that loop");
                    loop_new = new Loop(face, false, null, msgLabel);
                    loop_old.halfEdges.head = he2.nx;
                    loop_new.halfEdges.head = he1.nx;
                }

                loop_old.halfEdges.recalculateSize();
                loop_old.createTreeViewNodes();
                loop_new.halfEdges.recalculateSize();
                for (let [he] of loop_new.halfEdges) he.loop = loop_new;
                loop_new.createTreeViewNodes();

                //loop_new.partner_loop_for_sweep = loop_old;
            }

            printMsg(msgLabel, "Removed Edge #" + edge.ord);
            edge.destroy();

            face.draw();
            printMsg("");
            return loop_new;
        },

        /**
         * @param {number} f1_ord
         * @param {number} f2_ord
         */
        kfmrh: function(f1_ord, f2_ord) {
            const msgLabel = "kfmrh";
            printMsg("", msgLabel + " " + f1_ord + " " + f2_ord);

            if (! globalFaces.has(f1_ord)) {
                printMsg(msgLabel, "Error: Face #" + f1_ord + " does not exist.\n");
                return null;
            }
            if (! globalFaces.has(f2_ord)) {
                printMsg(msgLabel, "Error: Face #" + f2_ord + " does not exist.\n");
                return null;
            }

            let f1 = globalFaces.get(f1_ord);
            let f2 = globalFaces.get(f2_ord);

            if (! f1.plane) {
                printMsg(msgLabel, "Error: Face #" + f1_ord + " cannot be rendered as a planar polygon.\n");
                return null;
            }
            if (! f2.plane) {
                printMsg(msgLabel, "Error: Face #" + f2_ord + " cannot be rendered as a planar polygon.\n");
                return null;
            }

            const v1 = f1.outerLoop.halfEdges.head.v1;
            if (v1.isInLoop(f2.outerLoop, f2, true)) {
                printMsg("geometry", "Assuming Face #" + f1.ord
                    + " is the inner face, since Vertex #" + v1.ord
                    + " lies within Face #" + f2.ord);
            } else {
                printMsg("geometry", "Assuming Face #" + f1.ord
                    + " is the outer face, since Vertex #" + v1.ord
                    + " lies outside of Face #" + f2.ord);
                [f1, f2] = [f2, f1];
            }

            const [f_inner, f_outer] = [f1, f2];

            //kfmrh_on_one_solid(f1, f2);
            const solid = f_inner.solid;
            const loop_inner = f_inner.outerLoop;

            printMsg("kfmrh", "Removed Face #" + f_inner.ord);
            printMsg("kfmrh", "The original outer Loop #" + loop_inner.ord
                + " is now an inner loop of Face #" + f_outer.ord);

            f_inner.destroy();
            //loop_inner.removeTreeViewNodes();
            f_outer.innerLoops.append(loop_inner);
            loop_inner.face = f_outer;
            loop_inner.changeLoopType(false);
            loop_inner.createTreeViewNodes_all();
            f_outer.draw();

            const inner_solid = f_inner.solid;
            const outer_solid = f_outer.solid;
            if (inner_solid !== outer_solid) {
                const inner_faces = [];
                for (const [face] of inner_solid.faces) {
                    inner_faces.push(face);
                }
                for (const face of inner_faces) {
                    face.solid = outer_solid;
                    outer_solid.faces.append(face);
                    brepTreeViewSelector.jstree(true).move_node(face.id, outer_solid.id, "last");
                }

                printMsg("kfmrh", "Removed Solid #" + inner_solid.ord);
                brepTreeViewSelector.jstree(true).rename_node(inner_solid.id, "(REMOVED) " + inner_solid.id);
                brepTreeViewSelector.jstree(true).close_node(inner_solid.id);
            }

            printMsg("");
        },

        /**
         * @param {number} e_ord
         * @param {THREE.Vector3} pt
         * @returns {Vertex}
         */
        semv: function(e_ord, pt) {
            const msgLabel = "semv";
            printMsg("", msgLabel + " " + e_ord + " " + pt.x + " " + pt.y + " " + pt.z);

            if (! globalEdges.has(e_ord)) {
                printMsg(msgLabel, "Error: Edge #" + e_ord + " does not exist.\n");
                return null;
            }
            const edge = globalEdges.get(e_ord);
            const solid = edge.solid;
            const face1 = edge.he1.loop.face;
            const face2 = edge.he2.loop.face;
            const vertex = new Vertex(solid, pt, msgLabel);
            const edge_new = new Edge(solid, null, null, msgLabel);

            const [he1, he2] = edge.he1.split(vertex, true, edge_new, msgLabel);
            const [he3, he4] = edge.he2.split(vertex, false, edge_new, msgLabel);
            /*
            (edge.he1)
                he1        he2
            ---------> --------->
            <--------- <---------
                he4        he3
            (edge.he2)
             */

            edge_new.he1 = he2;
            edge_new.he2 = he3;
            edge_new.draw();
            edge.draw();

            face1.draw();
            if (face1 !== face2) face2.draw();
            printMsg("");
            return vertex;
        },

        /**
         * @param {number} f_ord
         * @param {THREE.Vector3} move_vec
         */
        sweep: function(f_ord, move_vec) {
            const msgLabel = "sweep";
            printMsg("", msgLabel + " " + f_ord + " " + move_vec.x + " " + move_vec.y + " " + move_vec.z);

            if (! globalFaces.has(f_ord)) {
                printMsg(msgLabel, "Error: Face #" + f_ord + " does not exist.\n");
                return null;
            }
            const face = globalFaces.get(f_ord);
            const outer_loop = face.outerLoop;

            if (face.plane) {
                const dot_prod = face.plane.normal.dot(move_vec);
                if (dot_prod < 0) {
                    printMsg(msgLabel, "Error: the normal vector of Face #" + f_ord +
                        " and the movement vector are not on the same side of the face.\n");
                    return null;
                }
            } else {
                printMsg(msgLabel, "WARNING: Face #" + f_ord + " cannot be rendered on a plane," +
                    " so I cannot judge the validness of this sweep operation.\n");
            }
            printMsg("");

            // sweep inner loops
            inner_top_faces = [];
            if (face.outerLoop.halfEdges.size > 0) {
                const partner_face = face.outerLoop.halfEdges.head.getPartner().loop.face;
                for (const [inner_loop] of partner_face.innerLoops) {
                    // const partner_loop = inner_loop.partner_loop_for_sweep;
                    // printMsg(msgLabel, "The partner of inner Loop #" + inner_loop.ord +
                    //     " is outer Loop #" + partner_loop.ord + "\n");
                    if (inner_loop.halfEdges.size > 0) {
                        const partner_loop = inner_loop.halfEdges.head.getPartner().loop;
                        sweep_single_loop(this, partner_loop, move_vec);
                        inner_top_faces.push(partner_loop.face);
                    }
                }
            }

            // sweep outer loop
            sweep_single_loop(this, outer_loop, move_vec);
            const outer_top_face = face;
            for (const f of inner_top_faces) {
                this.kfmrh(f.ord, outer_top_face.ord);
            }

            printMsg(msgLabel, "Sweep done");
            printMsg("");
        },

        deselect_all: function() {
            brepTreeViewSelector.jstree(true).deselect_all(false);
        },

        /**
         * @param {!string} commands_str
         */
        batchRun: function(commands_str) {
            const commands_arr = commands_str.split('\n');
            for(const com_str of commands_arr) {
                const com_arr = com_str.split(' ').filter(s => s);
                if (com_arr.length === 0) {continue;}
                //alert(com_arr);
                const name = com_arr[0];
                let paramNumErr = false;
                const p = com_arr.slice(1).map(x => Number(x));
                switch(name) {
                    case 'mvfs':
                        if (com_arr.length < 1+3) {paramNumErr = true; break;}
                        this.mvfs(new THREE.Vector3(p[0], p[1], p[2]));
                        break;
                    case 'mev':
                        if (com_arr.length < 1+5) {paramNumErr = true; break;}
                        this.mev(p[0], p[1], new THREE.Vector3(p[2], p[3], p[4]));
                        break;
                    case 'mef':
                        if (com_arr.length < 1+3) {paramNumErr = true; break;}
                        this.mef(p[0], p[1], p[2]);
                        break;
                    case 'kemr':
                        if (com_arr.length < 1+1) {paramNumErr = true; break;}
                        this.kemr(p[0]);
                        break;
                    case 'kfmrh':
                        if (com_arr.length < 1+2) {paramNumErr = true; break;}
                        this.kfmrh(p[0], p[1]);
                        break;
                    case 'semv':
                        if (com_arr.length < 1+4) {paramNumErr = true; break;}
                        this.semv(p[0], new THREE.Vector3(p[1], p[2], p[3]));
                        break;
                    case 'sweep':
                        if (com_arr.length < 1+4) {paramNumErr = true; break;}
                        this.sweep(p[0], new THREE.Vector3(p[1], p[2], p[3]));
                        break
                    default:
                        printMsg("", "Error: Unrecognized command " + name + "\n");
                        return false;
                }
                if (paramNumErr) {
                    printMsg("", "Error: Not enough parameters for command " + name + "\n");
                    return false;
                }
            }
            return true;
        },

        test: function() {
            //const node = treeViewNodes.get("Loop (outer) #13");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #6");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #5");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #3");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #1");
            // brepTreeViewSelector.jstree(true).delete_node("outer Loop #0");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #49");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #47");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #45");
            // brepTreeViewSelector.jstree(true).delete_node("HalfEdge #43");
            // brepTreeViewSelector.jstree(true).delete_node("outer Loop #1");

            //brepTreeViewSelector.jstree(true).rename_node("Face #0", "hello");

            //treeViewNodes.delete(id);
            // let node1 = new Solid();
            // let node2 = new Solid();
            // let node3 = new Solid();
            // let list = new List();
            // list.append(node1);
            // list.append(node2);
            // list.append(node3);
            // alert(list.print());
        },
    };

}

/*
class BREP {
    static ListNode = class {
    }
}
*/
