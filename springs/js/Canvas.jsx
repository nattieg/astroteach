import React from 'react';
import Raphael from 'raphael';
import _ from 'lodash';
import {RadioGroup, Radio} from 'react-radio-group';
import $ from 'jquery';

import Universe from './physics';

const MASS_RADIUS = 15;
const METERS_PER_PIXEL = 20;

export default class PhysicsCanvas extends React.Component {
    constructor() {
        super();
        _.bindAll(this, ['animate']);
        
        this.universe = new Universe();
        this.state = {
            mode: 'animate',
            type: 'pendulum',
            zoom: 1,
            speed: 30
        }
    }
    
    render() {
        return (
            <div>
                <div id="paper" />
                
            </div>
        );
    }

    componentDidMount() {
        this.setupCanvas();
        this.resetUniverse();
        this.animate();
    }

    // From physical coordinates (x) to paper coordinates (X)
    X(x) {
        return x * this.state.zoom*METERS_PER_PIXEL +Math.floor(this.paper.width/2); 
    }

    Y(y) {
        return Math.floor(this.paper.height/2)-y * this.state.zoom * METERS_PER_PIXEL; 
    }

    // From paper coordinates to physical coordinates
    x(X) {
        return (X-Math.floor(this.paper.width/2)) / (METERS_PER_PIXEL * this.state.zoom); 
    }

    y(Y) {
        return (Math.floor(this.paper.height/2)-Y) / (METERS_PER_PIXEL * this.state.zoom);
    }

    handleClick(e, mass) {
    }

    handleDragStart(X, Y, mass) {
    }

    handleDragMove(dX, dY, mass) {
    }

    handleDragEnd(X, Y, mass) {
    }

    // Set up canvas
    setupCanvas() {
        this.paper = new Raphael(document.getElementById("paper"),
                                 640,
                                 640);

        this.bg = this.paper.rect(0, 0, 640, 640);
        this.bg.attr({fill: 'black' });
        this.bg.touchend((e) => this.handleClick(e));
        this.bg.mouseup((e) => this.handleClick(e));
    }

    resetUniverse() {
        for (let mass of this.universe.masses)
            mass.el.remove();
        for (let con of this.universe.connections)
            con.el.remove();
        
        this.universe.masses = [];
        this.universe.connections = [];
        
        this.anchor = this.addMass(this.X(0), this.Y(0), true);
        
        if (this.state.type == 'pendulum') {
            const angle = Math.PI / 3;
            const X = 10 * Math.sin(angle);
            const Y = 10 * Math.cos(angle);
            
            this.mass = this.addMass(this.X(X), this.Y(Y), false);
            this.universe.gravity = 9.98;
            
            this.addPendulum(this.anchor, this.mass);
        } else if (this.state.type == 'vertical-spring') {
            this.mass = this.addMass(this.X(0), this.Y(-10), false);
            this.addSpring(this.anchor, this.mass);
        } else if (this.state.type == 'horizontal-spring') {
            this.mass = this.addMass(this.X(10), this.Y(0), false);
            this.addSpring(this.anchor, this.mass);
        } else {
            throw new Error('Unknown type ' + this.state.type);
        }
    }
    
    addMass(X, Y, anchored=false) {
        let mass = this.universe.addMass(this.x(X),
                                         this.y(Y),
                                         anchored);
        if (anchored) {
            mass.el = this.paper
                          .rect(X-MASS_RADIUS, Y-MASS_RADIUS,
                                2*MASS_RADIUS, 2*MASS_RADIUS)
        } else {
            mass.el = this.paper
                          .circle(X, Y, MASS_RADIUS)
        }
        
        mass.el.attr({ fill: (anchored ? 'white' : 'yellow') })
                .data({
                    originalFill: (anchored ? 'white' : 'yellow'),
                    type: 'mass'
                });
        
        mass.el.parent = mass;
        mass.el.drag((dX, dY, X, Y) => { this.handleDragMove(dX, dY, mass) },
                     (X, Y) => { this.handleDragStart(X, Y, mass) },
                     (e) => { this.handleDragEnd(e.x, e.y, mass) });

        mass.el.click((e) => this.handleClick(e, mass));
        return mass;
    }

    addSpring(mass1, mass2) {
        let spring = this.universe.addSpring(mass1, mass2);
        const X1 = this.X(mass1.position[0]);
        const Y1 = this.Y(mass1.position[1]);
        const X2 = this.X(mass2.position[0]);
        const Y2 = this.Y(mass2.position[1]);
        
        spring.el = this.paper
                        .path(`M${X1},${Y1} L${X2},${Y2}`)
                        .attr({ stroke: 'yellow', ['stroke-width']: 3 });
        spring.el.parent = spring;
        return spring;
    }

    addPendulum(mass1, mass2) {
        let pendulum = this.universe.addPendulum(mass1, mass2);
        const X1 = this.X(mass1.position[0]);
        const Y1 = this.Y(mass1.position[1]);
        const X2 = this.X(mass2.position[0]);
        const Y2 = this.Y(mass2.position[1]);
        
        pendulum.el = this.paper
                          .path(`M${X1},${Y1} L${X2},${Y2}`)
                          .attr({ stroke: 'yellow', ['stroke-width']: 3 });
        pendulum.el.parent = pendulum;
        return;
    }
    
    sync() {
        for (let mass of this.universe.masses) {
            mass.el.attr({
                cx: this.X(mass.position[0]),
                cy: this.Y(mass.position[1]),
                r: MASS_RADIUS * this.state.zoom
            });
            mass.el.toFront();
        }

        for (let con of this.universe.connections) {
            const path = `M${this.X(con.from.position[0])},${this.Y(con.from.position[1])} ` +
                         `L${this.X(con.to.position[0])},${this.Y(con.to.position[1])}`;
            con.el.attr({ path });
            con.el.toBack();
        }

        this.bg.toBack();
    }
    
    animate() {
        if (this.state.mode !== "animate")
            return;

        for (let i = 0; i < this.state.speed; i++)
            this.universe.evolve();

        this.sync();
        requestAnimationFrame(this.animate);
    }
}
