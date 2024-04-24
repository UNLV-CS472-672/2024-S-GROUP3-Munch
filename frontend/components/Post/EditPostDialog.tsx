import axios from 'axios';
import { FC, useContext } from 'react';
import { LogBox } from 'react-native';
import { useAuth } from '@clerk/clerk-react';
import { router, usePathname } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, SubmitHandler, set, useForm } from 'react-hook-form';
import Toast from 'react-native-toast-message';
import { Adapt, Button, Dialog, Sheet, XStack, Form } from 'tamagui';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import UserInput from '@/components/UserInput';
import { UserContext } from '@/contexts/UserContext';
import { Byte, Recipe } from '@/types/post';
import { ByteSchema, ByteSchemaInputs } from '@/types/postInput';

interface PostProps {
  post: Byte | Recipe;
}

export function EditPostDialog({ post }: PostProps) {
  LogBox.ignoreLogs(['??']);

  const { token } = useContext(UserContext);
  const queryClient = useQueryClient();
  let updatedPostData = { ...post };
  delete updatedPostData.key;
  const postLocation = usePathname();
  const postId = postLocation.split('/').pop();

  const { mutate, error } = useMutation({
    mutationFn: async (postData) => {
      const response = await axios.patch(
        `${process.env.EXPO_PUBLIC_IP_ADDR}/api/posts/${postId}`,
        postData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    },
    // Update the post with the edit
    onSuccess: async () => {
      Toast.show({ text1: 'Post edited!' });
      await queryClient.invalidateQueries({ queryKey: [postId] });
    },
    // Show error message in console
    onError: () => {
      Toast.show({
        text1: 'Error, post not edited. Please submit a bug report.',
      });
      console.log('error:', error.message);
    },
  });

  // validators
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ByteSchemaInputs>({
    resolver: zodResolver(ByteSchema),
    defaultValues: {
      ...post,
    },
  });

  // run when submitted
  const updateByte: SubmitHandler<ByteSchemaInputs> = async (data) => {
    try {
      updatedPostData.description = data.description;
      await mutate(updatedPostData);
      router.replace(postLocation); //reload page for newest updates on frontend
    } catch (err) {
      throw new Error(err.message);
    }
  };

  return (
    <>
      <Dialog modal>
        <Dialog.Trigger asChild>
          <Button minWidth='$14' backgroundColor={'$blue8'}>
            Edit
          </Button>
        </Dialog.Trigger>

        <Adapt when='sm' platform='touch'>
          <Sheet animation='medium' zIndex={200000} modal dismissOnSnapToBottom>
            <Sheet.Frame padding='$4' gap='$4'>
              <Adapt.Contents />
            </Sheet.Frame>
            <Sheet.Overlay
              animation='lazy'
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
          </Sheet>
        </Adapt>

        <Dialog.Portal>
          <Dialog.Overlay
            key='overlay'
            animation='slow'
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <Dialog.Content
            bordered
            elevate
            key='content'
            animateOnly={['transform', 'opacity']}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            gap='$4'
          >
            <Form onSubmit={handleSubmit(updateByte)}>
              <Dialog.Title>Edit Post</Dialog.Title>
              <Dialog.Description>
                Make changes to your post here. Click save when you're done.
              </Dialog.Description>
              <Controller
                name={'description'}
                control={control}
                render={({ field }) => (
                  <UserInput
                    field={field}
                    useLabel
                    labelID='Description'
                    key={'description'}
                    placeholder={post.description || ''}
                    sx={{ borderWidth: 1, size: '$5', width: '95%' }}
                  />
                )}
              />

              <XStack alignSelf='flex-end' gap='$4' margin='$4'>
                <Dialog.Close displayWhenAdapted asChild>
                  <Form.Trigger asChild>
                    <Button
                      backgroundColor={'$red9'}
                      aria-label='Close'
                      type='submit'
                    >
                      Save changes
                    </Button>
                  </Form.Trigger>
                </Dialog.Close>
              </XStack>
            </Form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
