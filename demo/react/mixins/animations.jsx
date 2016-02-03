module.exports = {
    startAnimation( event ) {
        event.preventDefault();

        var self = this;

        let animationID = setInterval(() => {
            requestAnimationFrame(() => {
                let next = ( self.state.step < (self.state.timeline.length - 1) ) ? self.state.step + 1 : 0;

                self.setState({ step: next }, () => {
                    self.drawMap( false );
                });
            });
        }, 250);

        self.setState({
            animationID: animationID
        });
    },

    endAnimation( event ) {
        if ( event ) {
            event.preventDefault();
        }

        if ( this.state.animationID ) {
            clearInterval( this.state.animationID );
            this.setState({ animationID: false });
        }
    }
}
