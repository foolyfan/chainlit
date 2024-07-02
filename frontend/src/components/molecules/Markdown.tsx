/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { PluggableList } from 'react-markdown/lib';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { type IMessageElement, useChatInteract } from '@chainlit/react-client';

import { InlineCode } from 'components/atoms/InlineCode';
import { Code } from 'components/molecules/Code';
import { ElementRef } from 'components/molecules/messages/components/ElementRef';

interface Props {
  allowHtml?: boolean;
  latex?: boolean;
  refElements?: IMessageElement[];
  children: string;
}

function Markdown({ refElements, allowHtml, latex, children }: Props) {
  const rehypePlugins = useMemo(() => {
    let rehypePlugins: PluggableList = [];
    if (allowHtml) {
      rehypePlugins = [rehypeRaw as any, ...rehypePlugins];
    }
    if (latex) {
      rehypePlugins = [rehypeKatex as any, ...rehypePlugins];
    }
    return rehypePlugins;
  }, [allowHtml, latex]);

  const remarkPlugins = useMemo(() => {
    let remarkPlugins: PluggableList = [remarkGfm as any];

    if (latex) {
      remarkPlugins = [remarkMath as any, ...remarkPlugins];
    }
    return remarkPlugins;
  }, [latex]);

  const { callPredefinedProcedure } = useChatInteract();

  const handleClick = (event: MouseEvent, childProps: { href: string }) =>
    // @ts-ignore: React.MouseEvent<HTMLAnchorElement, MouseEvent>
    {
      if (childProps.href.startsWith('/')) {
        // 阻止默认行为，即阻止跳转
        event.preventDefault();
        // 调用预定义流程
        callPredefinedProcedure(childProps.href, childProps.href);
      }

      // 判断 URL 是否以 "/predefined" 开头
      // if (url.startsWith('/predefined')) {
      //   // 不进行跳转
      //   console.log('不进行跳转');
      // } else {
      //   // 进行跳转
      //   console.log('进行跳转');
      //   window.location.href = url;
      // }
    };

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      className="markdown-body"
      components={{
        a({ children, ...props }) {
          const name = children as string;
          const element = refElements?.find((e) => e.name === name);

          if (element) {
            return <ElementRef element={element} />;
          } else {
            return (
              // @ts-ignore
              <Link
                {...props}
                target="_blank"
                // @ts-ignore
                onClick={(event) => handleClick(event, props)}
              >
                {children}
              </Link>
            );
          }
        },
        code({ ...props }) {
          return <InlineCode {...props} />;
        },
        pre({ ...props }) {
          return <Code {...props} />;
        },
        table({ children, ...props }) {
          return (
            <TableContainer
              sx={{
                width: 'fit-content',
                minWidth: '300px'
              }}
              elevation={0}
              component={Paper}
            >
              {/* @ts-ignore */}
              <Table {...props}>{children}</Table>
            </TableContainer>
          );
        },
        thead({ children, ...props }) {
          // @ts-ignore
          return <TableHead {...props}>{children}</TableHead>;
        },
        tr({ children, ...props }) {
          // @ts-ignore
          return <TableRow {...props}>{children}</TableRow>;
        },
        th({ children, ...props }) {
          return (
            // @ts-ignore
            <TableCell {...props} align="right" sx={{ padding: 1 }}>
              {children}
            </TableCell>
          );
        },
        td({ children, ...props }) {
          return (
            // @ts-ignore
            <TableCell {...props} align="right" sx={{ padding: 1 }}>
              {children}
            </TableCell>
          );
        },
        tbody({ children, ...props }) {
          // @ts-ignore
          return <TableBody {...props}>{children}</TableBody>;
        }
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export { Markdown };
