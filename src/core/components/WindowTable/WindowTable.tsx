import * as React from 'react';
import { Fragment, FunctionComponent, useEffect, useMemo, SyntheticEvent, useState, useRef } from 'react';
import { css } from 'emotion';
import { useCachedItem, useGuidelines, useHelpers, useOffsetSize, useScrollbarSize, useSections } from '../../hooks';
import { ItemType, ScrollDirection } from '../../hooks/useHelpers';

import styles from './WindowTable.module.scss';

type ScrollEvent = SyntheticEvent<HTMLDivElement>;

type WindowTableProps = {
  scrollTop?: number;
  scrollLeft?: number;
  width?: number;
  height?: number;
  columnCount: number;
  columnWidth: number | Function;
  rowCount: number;
  rowHeight: number | Function;

  fixedTopCount?: number;
  fixedLeftCount?: number;
  fixedRightCount?: number;
  fixedBottomCount?: number;
  overscanCount?: number;

  fillerColumn?: 'none' | 'append' | 'stretch' | 'shrink';
  fillerRow?: 'none' | 'append' | 'stretch' | 'shrink';
  /** 스크롤되는 뷰포트 너비가 특정값 이하로 떨어지면 fixedColumn 이 무효화된다. */
  minVisibleScrollViewWidth: number;
  minVisibleScrollViewHeight: number;

  containerStyle?: any;

  // maxScrollY?: number
  // maxScrollX?: number

  // cellStyle?: string;

  // columns: array

  // containerStyle?: string;
  // guidelineStyle?: Function;
};

function useContainerStyle(style) {
  const hashed = JSON.stringify(style);
  const [{ borderTopWidth, borderLeftWidth, borderRightWidth, borderBottomWidth }, setBorderStyle] = useState({
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  });

  const className = useMemo(() => {
    if (style && typeof style === 'object') {
      return css(style);
    }
    return '';
  }, [hashed]);

  const timer = useRef<number>();
  useEffect(() => {
    if (!className) {
      return;
    }

    let scrollDiv;
    scrollDiv = document.createElement('div');
    scrollDiv.className =
      css({
        position: 'absolute',
        top: -9999,
        width: 100,
        height: 100,
      }) +
      ' ' +
      className;
    document.body.appendChild(scrollDiv);
    function sizeCheck(doNotRemove) {
      timer.current && cancelAnimationFrame(timer.current);
      if (!scrollDiv) {
        return;
      }

      const computed = window.getComputedStyle(scrollDiv);
      const borderTopWidth = parseInt(computed.borderTopWidth, 10);
      console.log('>', computed.borderTopWidth);
      console.log('>', borderTopWidth);
      if (!isNaN(borderTopWidth)) {
        const borderLeftWidth = parseInt(computed.borderLeftWidth, 10) || 0;
        const borderRightWidth = parseInt(computed.borderRightWidth, 10) || 0;
        const borderBottomWidth = parseInt(computed.borderBottomWidth, 10) || 0;
        if (!doNotRemove) {
          document.body.removeChild(scrollDiv);
          scrollDiv = null;
        }
        setBorderStyle({
          borderTopWidth,
          borderLeftWidth,
          borderRightWidth,
          borderBottomWidth,
        });
        return;
      }

      timer.current = requestAnimationFrame(sizeCheck);
    }
    // sizeCheck(true);
    sizeCheck(true);
    setTimeout(sizeCheck);

    return () => {
      timer.current && cancelAnimationFrame(timer.current);
      scrollDiv && document.body.removeChild(scrollDiv);
    };
  }, [className]);

  return {
    className,
    borderTopWidth,
    borderLeftWidth,
    borderRightWidth,
    borderBottomWidth,
  };
}

const WindowTable: FunctionComponent<WindowTableProps> = (props) => {
  const [{ scrollTop, scrollLeft, verticalScrollDirection, horizontalScrollDirection }, setScroll] = useState({
    scrollTop: 0,
    scrollLeft: 0,
    verticalScrollDirection: ScrollDirection.FORWARD,
    horizontalScrollDirection: ScrollDirection.FORWARD,
  });
  const handleScroll = (event: ScrollEvent) => {
    const { scrollTop: nextScrollTop, scrollLeft: nextScrollLeft } = event.currentTarget;
    setScroll({
      scrollTop: nextScrollTop,
      scrollLeft: nextScrollLeft,
      verticalScrollDirection: scrollTop > nextScrollTop ? ScrollDirection.BACKWARD : ScrollDirection.FORWARD,
      horizontalScrollDirection: scrollLeft > nextScrollLeft ? ScrollDirection.BACKWARD : ScrollDirection.FORWARD,
    });
  };

  const {
    className: containerStyle,
    borderTopWidth,
    borderLeftWidth,
    borderRightWidth,
    borderBottomWidth,
  } = useContainerStyle(props.containerStyle);

  console.log({
    borderTopWidth,
    borderLeftWidth,
    borderRightWidth,
    borderBottomWidth,
  });

  const container = useRef<HTMLDivElement>(null);
  const [parentWidth, parentHeight, _offsetWidth, _offsetHeight] = useOffsetSize(props, container, {
    borderTopWidth,
    borderLeftWidth,
    borderRightWidth,
    borderBottomWidth,
  });

  const [scrollbarWidth, scrollbarHeight] = useScrollbarSize();
  const { columnCount, columnWidth, rowCount, rowHeight } = props;
  let { fixedTopCount = 0, fixedBottomCount = 0, fixedLeftCount = 0, fixedRightCount = 0 } = props;

  const helpers = useHelpers({
    columnCount,
    columnWidth,
    rowCount,
    rowHeight,
    fixedTopCount,
    fixedBottomCount,
    fixedLeftCount,
    fixedRightCount,
    offsetWidth: _offsetWidth,
    offsetHeight: _offsetHeight,
    scrollbarWidth,
    scrollbarHeight,
    overscanCount: props.overscanCount,
    fillerColumn: props.fillerColumn,
    fillerRow: props.fillerRow,
    minVisibleScrollViewWidth: props.minVisibleScrollViewWidth,
    minVisibleScrollViewHeight: props.minVisibleScrollViewHeight,
  });

  const {
    columnMetadata,
    rowMetadata,
    scrollWidth,
    scrollHeight,
    clientWidth,
    clientHeight,
    offsetWidth,
    offsetHeight,
  } = helpers;

  const { getItemMetadata, getRange } = helpers;

  const [rowStartIndex, rowStopIndex] = getRange(ItemType.ROW, scrollTop, verticalScrollDirection);
  const [columnStartIndex, columnStopIndex] = getRange(ItemType.COLUMN, scrollLeft, horizontalScrollDirection);

  const getCachedStyle = useCachedItem({
    getItemMetadata,
    columnCount,
    columnWidth,
    rowCount,
    rowHeight,
    children: props.children,
  });

  const { center, sections } = useSections(
    rowMetadata,
    columnMetadata,
    rowStartIndex,
    rowStopIndex,
    columnStartIndex,
    columnStopIndex,
    clientWidth,
    clientHeight,
    getCachedStyle,
  );

  const guidelines = useGuidelines(rowMetadata, columnMetadata, clientWidth, clientHeight);

  // console.log(columnMetadata);

  return (
    <div ref={container} className={containerStyle + ' ' + styles.container} style={{ height: parentHeight }}>
      {/* <pre>
        {JSON.stringify({
          borderTopWidth,
          borderLeftWidth,
          borderRightWidth,
          borderBottomWidth,
        })}
      </pre> */}
      {/* <pre>
        {JSON.stringify({
          rowStartIndex,
          rowStopIndex,
          columnStartIndex,
          columnStopIndex,
        })}
      </pre>
      <pre>
        {JSON.stringify({
          fixedBottomCount,
          fixedRightCount
        })}
      </pre> */}
      {/* <div className={styles.guidelines} style={{ width: clientWidth, height: clientHeight }}>
        {guidelines.map((guideline) => {
          return <div className={guideline.className} style={guideline.style} />;
        })}
      </div> */}
      <div style={{ width: offsetWidth, height: offsetHeight }} className={styles.root} onScroll={handleScroll}>
        <div style={{ width: scrollWidth, height: scrollHeight }}>
          {sections.map((section) => (
            <div key={section.key} className={section.className} style={section.style}>
              {section.items}
            </div>
          ))}
          {/* {guidelines.map(guideline => {
        return (
          <div className={styles.guideline.className} style={guideline.style} />
        )
      })} */}
          <div className={styles.center}>{center.items}</div>
        </div>
      </div>

      {/* <h4>
        {horizontalScrollDirection}, {verticalScrollDirection},{scrollLeft}, {scrollTop}, {clientWidth},{' '}
        {clientHeight}
      </h4> */}
    </div>
  );
};

export default WindowTable;
