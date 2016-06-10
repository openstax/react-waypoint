import React, { PropTypes } from 'react';

const POSITIONS = {
  above: 'above',
  inside: 'inside',
  below: 'below',
  invisible: 'invisible',
};

const propTypes = {
  debug: PropTypes.bool,
  // threshold is percentage of the height of the visible part of the
  // scrollable ancestor (e.g. 0.1)
  threshold: PropTypes.number,
  onEnter: PropTypes.func,
  onLeave: PropTypes.func,
  onPositionChange: PropTypes.func,
  fireOnRapidScroll: PropTypes.bool,
  scrollableAncestor: PropTypes.any,
  throttleHandler: PropTypes.func
};

const defaultProps = {
  threshold: 0,
  onEnter() {},
  onLeave() {},
  onPositionChange() {},
  fireOnRapidScroll: true,
  throttleHandler(handler) {
    return handler;
  }
};

function debugLog() {
  console.log(arguments); // eslint-disable-line no-console
}

/**
 * Calls a function when you scroll to the element.
 */
export default class Waypoint extends React.Component {
  componentWillMount() {
    if (this.props.scrollableParent) { // eslint-disable-line react/prop-types
      throw new Error('The `scrollableParent` prop has changed name ' +
                      'to `scrollableAncestor`.');
    }
  }

  componentDidMount() {
    if (!Waypoint.getWindow()) {
      return;
    }
    this._handleScroll =
      this.props.throttleHandler(this._handleScroll.bind(this));
    this.scrollableAncestor = this._findScrollableAncestor();
    if (this.props.debug) {
      debugLog('scrollableAncestor', this.scrollableAncestor);
    }
    this.scrollableAncestor.addEventListener('scroll', this._handleScroll);
    window.addEventListener('resize', this._handleScroll);
    this._handleScroll(null);
  }

  componentDidUpdate() {
    if (!Waypoint.getWindow()) {
      return;
    }

    // The element may have moved.
    this._handleScroll(null);
  }

  componentWillUnmount() {
    if (!Waypoint.getWindow()) {
      return;
    }

    if (this.scrollableAncestor) {
      // At the time of unmounting, the scrollable ancestor might no longer
      // exist. Guarding against this prevents the following error:
      //
      //   Cannot read property 'removeEventListener' of undefined
      this.scrollableAncestor.removeEventListener('scroll', this._handleScroll);
    }
    window.removeEventListener('resize', this._handleScroll);
  }

  /**
   * Traverses up the DOM to find an ancestor container which has an overflow
   * style that allows for scrolling.
   *
   * @return {Object} the closest ancestor element with an overflow style that
   *   allows for scrolling. If none is found, the `window` object is returned
   *   as a fallback.
   */
  _findScrollableAncestor() {
    if (this.props.scrollableAncestor) {
      return this.props.scrollableAncestor;
    }

    let node = React.findDOMNode(this);

    while (node.parentNode) {
      node = node.parentNode;

      if (node === document) {
        // This particular node does not have a computed style.
        continue;
      }

      if (node === document.documentElement) {
        // This particular node does not have a scroll bar, it uses the window.
        continue;
      }

      const style = window.getComputedStyle(node);
      const overflowY = style.getPropertyValue('overflow-y') ||
        style.getPropertyValue('overflow');

      if (overflowY === 'auto' || overflowY === 'scroll') {
        return node;
      }
    }

    // A scrollable ancestor element was not found, which means that we need to
    // do stuff on window.
    return window;
  }

  /**
   * @param {Object} event the native scroll event coming from the scrollable
   *   ancestor, or resize event coming from the window. Will be undefined if
   *   called by a React lifecyle method
   */
  _handleScroll(event) {
    const currentPosition = this._currentPosition();
    const previousPosition = this._previousPosition || null;
    if (this.props.debug) {
      debugLog('currentPosition', currentPosition);
      debugLog('previousPosition', previousPosition);
    }

    // Save previous position as early as possible to prevent cycles
    this._previousPosition = currentPosition;

    if (previousPosition === currentPosition) {
      // No change since last trigger
      return;
    }

    const callbackArg = {
      currentPosition,
      previousPosition,
      event,
    };
    this.props.onPositionChange.call(this, callbackArg);

    if (currentPosition === POSITIONS.inside) {
      this.props.onEnter.call(this, callbackArg);
    } else if (previousPosition === POSITIONS.inside) {
      this.props.onLeave.call(this, callbackArg);
    }

    const isRapidScrollDown = previousPosition === POSITIONS.below &&
      currentPosition === POSITIONS.above;
    const isRapidScrollUp =   previousPosition === POSITIONS.above &&
      currentPosition === POSITIONS.below;
    if (this.props.fireOnRapidScroll &&
        (isRapidScrollDown || isRapidScrollUp)) {
      // If the scroll event isn't fired often enough to occur while the
      // waypoint was visible, we trigger both callbacks anyway.
      this.props.onEnter.call(this, {
        currentPosition: POSITIONS.inside,
        previousPosition,
        event,
      });
      this.props.onLeave.call(this, {
        currentPosition,
        previousPosition: POSITIONS.inside,
        event,
      });
    }
  }

  /**
   * @return {string} The current position of the waypoint in relation to the
   *   visible portion of the scrollable parent. One of `POSITIONS.above`,
   *   `POSITIONS.below`, or `POSITIONS.inside`.
   */
  _currentPosition() {
    const waypointTop = React.findDOMNode(this).getBoundingClientRect().top;
    let contextHeight;
    let contextScrollTop;
    if (this.scrollableAncestor === window) {
      contextHeight = window.innerHeight;
      contextScrollTop = 0;
    } else {
      contextHeight = this.scrollableAncestor.offsetHeight;
      contextScrollTop = React
        .findDOMNode(this.scrollableAncestor)
        .getBoundingClientRect().top;
    }
    if (this.props.debug) {
      debugLog('waypoint top', waypointTop);
      debugLog('scrollableAncestor height', contextHeight);
      debugLog('scrollableAncestor scrollTop', contextScrollTop);
    }
    const thresholdPx = contextHeight * this.props.threshold;
    const contextBottom = contextScrollTop + contextHeight;

    if (contextHeight === 0) {
      return Waypoint.invisible;
    }

    if (contextScrollTop <= waypointTop + thresholdPx &&
        waypointTop - thresholdPx <= contextBottom) {
      return Waypoint.inside;
    }

    if (contextBottom < waypointTop - thresholdPx) {
      return Waypoint.below;
    }

    if (waypointTop + thresholdPx < contextScrollTop) {
      return Waypoint.above;
    }

    return Waypoint.invisible;
  }

  /**
   * @return {Object}
   */
  render() {
    // We need an element that we can locate in the DOM to determine where it is
    // rendered relative to the top of its context.
    return <span style={{fontSize: 0}} />;
  }
}

Waypoint.propTypes = propTypes;
Waypoint.above = POSITIONS.above;
Waypoint.below = POSITIONS.below;
Waypoint.inside = POSITIONS.inside;
Waypoint.invisible = POSITIONS.invisible;
Waypoint.getWindow = () => {
  if (typeof window !== 'undefined') {
    return window;
  }
};
Waypoint.defaultProps = defaultProps;
Waypoint.displayName = 'Waypoint';
