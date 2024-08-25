const RESOLUTION = 800;

let canvas;
let ctxt;

let polygon;

window.onload = () => {
    canvas = document.getElementById("canvas");
    canvas.width = RESOLUTION;
    canvas.height = RESOLUTION;
    ctxt = canvas.getContext("2d");

    polygon = new StarPolygon(RESOLUTION / 2, RESOLUTION / 2, 20, RESOLUTION / 10, RESOLUTION / 2.25, 1);

    render();
}

function getRotation(angle1, angle2) {

    let rotation = angle2 - angle1;

    if (rotation > Math.PI) {
        rotation -= 2 * Math.PI;
    }
    if (rotation < -Math.PI) {
        rotation += 2 * Math.PI;
    }

    return rotation;
}

function render() {
    let showMaxEdgeAngle = document.getElementById("show-max-edge-angle").checked;
    let showSortedEdgeSubSet1 = document.getElementById("show-sorted-edge-sub-set-1").checked;
    let showSortedEdgeSubSet2 = document.getElementById("show-sorted-edge-sub-set-2").checked;

    ctxt.clearRect(0, 0, RESOLUTION, RESOLUTION);

    polygon.render(ctxt, showMaxEdgeAngle, showSortedEdgeSubSet1, showSortedEdgeSubSet2);
}

class StarPolygon {
    constructor(centerX, centerY, maxVertexCount, minDistance, maxDistance, vertexProbability) {
        this.points = [];

        for (let i = 0; i < maxVertexCount; i++) {
            if (Math.random() > vertexProbability) {
                continue;
            }

            let angle = 2 * Math.PI * (i / maxVertexCount);
            let distance = Math.random() * (maxDistance - minDistance) + minDistance;
            this.points.push([
                centerX + distance * Math.cos(angle),
                centerY + distance * Math.sin(angle),
            ]);
        }

        this.edgeAngles = [];
        for (let i = 0; i < this.points.length - 1; i++) {
            this.edgeAngles.push(
                Math.atan2(this.points[i][1] - this.points[i + 1][1], this.points[i][0] - this.points[i + 1][0])
            );
        }
        this.edgeAngles.push(
            Math.atan2(this.points[this.points.length - 1][1] - this.points[0][1], this.points[this.points.length - 1][0] - this.points[0][0])
        );

        this.rotations = [];
        for (let i = 0; i < this.edgeAngles.length - 1; i++) {
            this.rotations.push(
                getRotation(this.edgeAngles[i], this.edgeAngles[i + 1])
            );
        }
        this.rotations.push(
            getRotation(this.edgeAngles[this.edgeAngles.length - 1], this.edgeAngles[0])
        );

        // compute offset so when computing chains we don't accidentally start inside a chain but instead start at a definite chain start
        let lowestRotation = Math.PI;
        let indexOffset = 0;
        for (let i = 0; i < this.rotations.length; i++) {
            if (this.rotations[i] < lowestRotation) {
                lowestRotation = this.rotations[i];
                indexOffset = (i + 1) % this.rotations.length;
            }
        }

        let maxRotationSum = 0;
        let currentRotationSum = 0;
        let currentChainIndex1 = indexOffset;
        let currentChainIndex2 = 0;
        this.maxAngleIndex1 = 0;
        this.maxAngleIndex2 = 0;

        for (let i = 0; i < this.rotations.length; i++) {
            let index = (i + indexOffset) % this.rotations.length;
            let rotation = this.rotations[index];

            let nextValue = currentRotationSum + rotation;
            if (nextValue <= 0) {
                currentRotationSum = 0;
                currentChainIndex1 = (index + 1) % this.rotations.length;
            } else {
                currentRotationSum = nextValue;
                currentChainIndex2 = (index + 1) % this.rotations.length;
            }

            if (currentRotationSum > maxRotationSum) {
                maxRotationSum = currentRotationSum;
                this.maxAngleIndex1 = currentChainIndex1;
                this.maxAngleIndex2 = currentChainIndex2;
            }
        }

        // compute the two edge sets
        this.sortedEdgeSubSet1 = [this.maxAngleIndex1];
        this.sortedEdgeSubSet2 = [];
        let currentRotation = 0;
        let maxRotation = -Math.PI;
        for (let i = 0; i < this.rotations.length; i++) {
            let index = (this.maxAngleIndex1 + i) % this.rotations.length;
            if (index === this.maxAngleIndex2) {
                this.sortedEdgeSubSet1.push(index);
                break;
            }
            currentRotation += this.rotations[index];
            if (currentRotation > maxRotation) {
                maxRotation = currentRotation;
                this.sortedEdgeSubSet1.push((index + 1) % this.rotations.length);
            }
        }
        currentRotation = 0;
        maxRotation = Math.PI;
        for (let i = 0; i < this.rotations.length; i++) {
            let index = (this.maxAngleIndex2 - i + this.rotations.length) % this.rotations.length;
            if (index === this.maxAngleIndex1) {
                this.sortedEdgeSubSet2.push(index);
                break;
            }
            currentRotation -= this.rotations[index];
            if (currentRotation < maxRotation) {
                maxRotation = currentRotation;
                this.sortedEdgeSubSet2.push(index);
            }
        }

        // here it would be possible to compute the kernel in linear time
        // by computing the convex-hulls of the dual-points of the edges (possible because sets are sorted)
        // and merging the resulting two convex polygons
    }

    render(ctxt, showMaxEdgeAngle, showSortedEdgeSubSet1, showSortedEdgeSubSet2) {
        ctxt.lineWidth = 5;
        ctxt.strokeStyle = "#FFF";
        ctxt.beginPath();
        ctxt.moveTo(this.points[0][0], this.points[0][1]);
        for (let i = 1; i < this.points.length; i++) {
            ctxt.lineTo(this.points[i][0], this.points[i][1]);
        }
        ctxt.closePath();
        ctxt.stroke();

        ctxt.setLineDash([10, 10]);

        if(showSortedEdgeSubSet1) {
            ctxt.strokeStyle = "#F00";
            for (let i = 0; i < this.sortedEdgeSubSet1.length; i++) {
                let index1 = this.sortedEdgeSubSet1[i]
                let index2 = (this.sortedEdgeSubSet1[i] + 1) % this.points.length
                ctxt.beginPath();
                ctxt.moveTo(this.points[index1][0], this.points[index1][1]);
                ctxt.lineTo(this.points[index2][0], this.points[index2][1]);
                ctxt.stroke();
            }
        }

        if(showSortedEdgeSubSet2) {
            ctxt.strokeStyle = "#00F";
            ctxt.lineDashOffset = 10;
            for (let i = 0; i < this.sortedEdgeSubSet2.length; i++) {
                let index1 = this.sortedEdgeSubSet2[i]
                let index2 = (this.sortedEdgeSubSet2[i] + 1) % this.points.length
                ctxt.beginPath();
                ctxt.moveTo(this.points[index1][0], this.points[index1][1]);
                ctxt.lineTo(this.points[index2][0], this.points[index2][1]);
                ctxt.stroke();
            }
        }
        ctxt.lineDashOffset = 0;
        ctxt.setLineDash([]);

        let index3 = (this.maxAngleIndex1 + 1) % this.points.length;
        let index4 = (this.maxAngleIndex2 + 1) % this.points.length;

        if(showMaxEdgeAngle) {
            ctxt.strokeStyle = "#F00";
            ctxt.beginPath();
            ctxt.moveTo(this.points[this.maxAngleIndex1][0], this.points[this.maxAngleIndex1][1]);
            ctxt.lineTo(this.points[index3][0], this.points[index3][1]);
            ctxt.stroke();

            ctxt.strokeStyle = "#00F";
            ctxt.beginPath();
            ctxt.moveTo(this.points[this.maxAngleIndex2][0], this.points[this.maxAngleIndex2][1]);
            ctxt.lineTo(this.points[index4][0], this.points[index4][1]);
            ctxt.stroke();
        }

        for (let i = 0; i < this.points.length; i++) {
            ctxt.beginPath();
            ctxt.arc(this.points[i][0], this.points[i][1], 7, 0, 2 * Math.PI);
            ctxt.fill();
        }
    }
}
