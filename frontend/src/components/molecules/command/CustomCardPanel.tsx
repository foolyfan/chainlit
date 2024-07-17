import {
  faFloppyDisk,
  faLocationDot,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { apiClient } from 'api';
import { useAuth } from 'api/auth';
import html2canvas from 'html2canvas';
import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { isAndroid } from 'utils/tools';

import { Telegram } from '@mui/icons-material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  styled
} from '@mui/material';

import { useAlbum, useChatSession } from 'client-types/*';

interface Props {}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1
});

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2)
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1)
  }
}));

const CustomCardPanel: FC<Props> = () => {
  // 银行卡图片尺寸
  const cardSize = { width: 299, height: 187 };
  // 缩放
  const [scale, setScale] = useState<number>(1);
  const onTransformToLarge = useCallback(() => {
    setScale((old) => Number((old + 0.2).toFixed(2)));
  }, []);
  const onTransformToSmall = useCallback(() => {
    setScale((old) => Number((old - 0.2).toFixed(2)));
  }, []);

  // 拖动
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }>({ minX: 0, minY: 0, maxX: 0, maxY: 0 });

  const handleMaskTouchStart = (event: TouchEvent) => {
    const touch = event.targetTouches[0];
    const pos = {
      x: touch.pageX - position.x,
      y: touch.pageY - position.y
    };
    setRel(pos);

    setDragging(true);
    event.stopPropagation();
  };

  const handleMaskTouchMove = (event: TouchEvent) => {
    if (!dragging) return;

    const touch = event.targetTouches[0];
    const newPos = { x: touch.pageX - rel.x, y: touch.pageY - rel.y };
    // 越界检查
    if (
      newPos.x < bounds.minX ||
      newPos.x > bounds.maxX ||
      newPos.y < bounds.minY ||
      newPos.y > bounds.maxY
    ) {
      return;
    }

    setPosition(newPos);
  };

  const handleMaskTouchEnd = (event: TouchEvent) => {
    setDragging(false);
    event.stopPropagation();
  };

  // 图像重置缩放和位置
  const onReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }, []);

  // 选取文件
  const [localFile, setLocalFile] = useState<File>();
  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLocalFile(event.target.files![0]);
    },
    []
  );
  // 安卓打开相册
  const { text, status, invokeAlbum } = useAlbum();
  const onOpenAlbum = useCallback(() => {
    invokeAlbum();
  }, []);
  useEffect(() => {
    if (status == 'finish' && text) {
      console.log('选取完成');
    }
  }, [status]);

  const [editDisabled, setEditDisabled] = useState<boolean>(true);
  // 图片
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  useEffect(() => {
    if (localFile) {
      const imgURL = URL.createObjectURL(localFile);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageSrc((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        return imgURL;
      });
      setEditDisabled(false);
    }
  }, [localFile]);

  const [imageOriginSize, setImageOriginSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setImageOriginSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }
    return () => {
      if (imageRef.current) {
        resizeObserver.unobserve(imageRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const offset = 20;
    if (containerRef.current && imageRef.current) {
      // 原始表达式
      // const minX =
      //   offset -
      //   imageOriginSize.width -
      //   (imageOriginSize.width * (scale - 1)) / 2;
      const minX = offset - (imageOriginSize.width * (scale + 1)) / 2;
      const minY = offset - (imageOriginSize.height * (scale + 1)) / 2;
      // 原始表达式
      // const maxX =
      //   containerRef.current!.offsetWidth -
      //   offset +
      //   (imageOriginSize.width * (scale - 1)) / 2;
      const maxX =
        containerRef.current!.offsetWidth -
        (offset - (imageOriginSize.width * (scale - 1)) / 2);
      const maxY =
        containerRef.current!.offsetHeight -
        (offset - (imageOriginSize.height * (scale - 1)) / 2);
      setBounds({
        minX,
        maxX,
        minY,
        maxY
      });
    }
  }, [containerRef, imageOriginSize, scale]);

  // 回到中心位置
  const onCenter = useCallback(() => {
    setPosition({
      x: containerRef.current!.offsetWidth / 2 - imageOriginSize.width / 2,
      y: containerRef.current!.offsetHeight / 2 - imageOriginSize.height / 2
    });
  }, [imageOriginSize]);

  // 预览窗口
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string>('');
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const handleClose = useCallback(() => {
    setPreviewOpen(false);
  }, []);
  // 销毁函数
  const destoryBlob = useCallback(() => {
    imageSrc && URL.revokeObjectURL(imageSrc);
    previewImageSrc && URL.revokeObjectURL(previewImageSrc);
  }, [imageSrc, previewImageSrc]);
  const handleSubmit = useCallback(() => {
    destoryBlob();
    setPreviewOpen(false);
  }, [destoryBlob]);

  // 预览
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const onPreview = useCallback(() => {
    setPreviewOpen(true);
    html2canvas(containerRef.current!, {
      x: cropContainerRef.current!.offsetLeft,
      y: cropContainerRef.current!.offsetTop,
      width: cardSize.width,
      height: cardSize.height,
      ignoreElements: (element) => {
        return element.id == 'mask';
      }
    }).then((canvas) => {
      canvas.toBlob((data) => {
        const previewUrl = URL.createObjectURL(data!);
        setPreviewImageSrc((oldUrl) => {
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
          return previewUrl;
        });
      });
    });
  }, []);

  // 文生图
  const [value, setValue] = useState<string>('');
  const { accessToken } = useAuth();
  const { sessionId } = useChatSession();
  const [aigcDisabled, setAigcDisabled] = useState<boolean>(true);
  const [aigcLoading, setAigcLoading] = useState<boolean>(false);
  const onGetAigcImage = useCallback(() => {
    setAigcLoading(true);
    apiClient
      .aigcImageMethod(value, sessionId, undefined, accessToken)
      .then((response) => response.blob())
      .then((blob) => {
        const imageUrl = URL.createObjectURL(blob);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setImageSrc((oldUrl) => {
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
          return imageUrl;
        });
        setEditDisabled(false);
      })
      .finally(() => {
        setAigcLoading(false);
      });
  }, [apiClient, value, sessionId, accessToken]);

  const maskColor = '#d7d7d7';
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: 'flex',
          flexDirection: 'column'
        }}
        open={aigcLoading}
        onClick={handleClose}
      >
        <CircularProgress color="inherit" />
        <Box sx={{ marginTop: '10px' }}>AI生成中 ...</Box>
      </Backdrop>
      <Typography variant="h6" gutterBottom>
        图像编辑
      </Typography>
      <Box
        ref={containerRef}
        id="image-container"
        sx={{
          height: '50%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          style={{
            objectFit: 'contain',
            transform: `scale(${scale})`,
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`
          }}
          alt=""
        />
        <Box
          id="mask"
          component="div"
          sx={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%'
          }}
          onTouchStart={(event) => handleMaskTouchStart(event.nativeEvent)}
          onTouchEnd={(event) => handleMaskTouchEnd(event.nativeEvent)}
          onTouchMove={(event) => handleMaskTouchMove(event.nativeEvent)}
        >
          <Box
            sx={{
              flexGrow: 1,
              bgcolor: maskColor,
              opacity: '0.5',
              width: '100%'
            }}
          ></Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'row',
              width: '100%'
            }}
          >
            <Box sx={{ flexGrow: 1, bgcolor: maskColor, opacity: '0.5' }}></Box>
            <Box
              ref={cropContainerRef}
              sx={{
                width: `${cardSize.width}px`,
                height: `${cardSize.height}px`,
                borderRadius: '8px',
                bgcolor: 'transparent'
              }}
            ></Box>
            <Box sx={{ flexGrow: 1, bgcolor: maskColor, opacity: '0.5' }}></Box>
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              bgcolor: maskColor,
              opacity: '0.5',
              width: '100%'
            }}
          ></Box>
        </Box>
      </Box>
      <Box
        sx={{
          padding: (theme) => theme.spacing(1, 0, 2, 1),
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'end'
        }}
      >
        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          onClick={onTransformToLarge}
          disabled={editDisabled}
        >
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} size="xl" />
        </Button>

        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          onClick={onTransformToSmall}
          disabled={editDisabled}
        >
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} size="xl" />
        </Button>
        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          onClick={onCenter}
          disabled={editDisabled}
        >
          <FontAwesomeIcon icon={faLocationDot} size="xl" />
        </Button>
        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          onClick={onReset}
          disabled={editDisabled}
        >
          <FontAwesomeIcon icon={faRotateRight} size="xl" />
        </Button>
        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          onClick={onPreview}
          disabled={editDisabled}
        >
          <FontAwesomeIcon icon={faFloppyDisk} size="xl" />
        </Button>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Typography variant="h6" gutterBottom>
          图像选择
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <TextField
            type="text"
            id="chat-input"
            multiline
            variant="outlined"
            placeholder="AI绘图提示文本"
            autoComplete="false"
            value={value}
            onChange={(e) => {
              const value = e.target.value;
              if (value && value.length) {
                setAigcDisabled(false);
              } else {
                setAigcDisabled(true);
              }
              setValue(e.target.value);
            }}
            InputProps={{
              sx: {
                padding: (theme) => theme.spacing(1)
              },
              startAdornment: (
                <InputAdornment
                  sx={{ ml: 1, color: 'text.secondary' }}
                  position="start"
                />
              ),
              endAdornment: (
                <IconButton
                  disabled={aigcDisabled}
                  color="inherit"
                  onClick={onGetAigcImage}
                >
                  <Telegram />
                </IconButton>
              )
            }}
            sx={{
              width: '100%'
            }}
          ></TextField>
        </Box>
        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          startIcon={<CloudUploadIcon />}
          sx={{
            width: '100%',
            marginTop: '10px'
          }}
          onClick={() => isAndroid() && onOpenAlbum()}
        >
          上传图片
          {!isAndroid() && (
            <VisuallyHiddenInput
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
            />
          )}
        </Button>
      </Box>
      <BootstrapDialog onClose={handleClose} open={previewOpen}>
        <DialogTitle sx={{ m: 0, p: 2 }}>预览</DialogTitle>
        <DialogContent dividers>
          <img
            ref={previewImageRef}
            src={previewImageSrc}
            alt=""
            style={{ width: '100%', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button type="submit" onClick={handleSubmit}>
            确定
          </Button>
        </DialogActions>
      </BootstrapDialog>
    </Box>
  );
};

export { CustomCardPanel };
